# Supabase Authentication — Explained Simply

> Written for anyone new to Supabase. No prior knowledge needed.

---

## The Question That Started This

> *"Why can't we just create one table called `profiles` and manage everything from there?
> I can't even see the users table — why is it so complicated?"*

This is a completely fair question. Let's answer it properly.

---

## What Is Supabase Auth?

Supabase is a backend service built on top of PostgreSQL (a database).

When you use Supabase for login/signup, it comes with a built-in **authentication engine**.
That engine is responsible for:

- Storing passwords **safely** (encrypted, never plain text)
- Sending confirmation emails
- Generating login tokens (JWT)
- Handling sessions, password resets, OAuth (Google, GitHub, etc.)

This engine stores its data in a special place called **`auth.users`**.

---

## Why Can't You See `auth.users` in the Dashboard?

Supabase **hides** the `auth.users` table from you on purpose.

Think of it like a bank vault. The vault exists, it holds your money (user credentials),
but the bank doesn't let you walk in and move things around yourself.
You interact with it only through the bank's approved systems (the teller, the app, the ATM).

`auth.users` works the same way:
- You cannot query it directly from your app
- You cannot add custom columns to it (like `role` or `organization_name`)
- Only Supabase's internal Auth system can write to it

This is intentional — it keeps passwords and tokens protected.

---

## So Where Do We Store Role, Name, Organization?

Since we can't add columns to `auth.users`, we create our **own table** called `profiles`.

```
auth.users          profiles (our table)
-----------         --------------------
id                  id  ←———— same ID links the two
email               full_name
password (hidden)   role  (admin / ngo / social_worker)
...                 organization_name
                    created_at
```

The `id` column in `profiles` is the **same UUID** as the user's `id` in `auth.users`.
This is the link between the two. One person = one row in `auth.users` + one row in `profiles`.

---

## Why Not Just One Table?

Here's the honest answer:

**You physically cannot.**

Supabase Auth is a closed system. It manages `auth.users` internally.
You are not allowed to:
- Add columns to `auth.users`
- Replace it with your own table
- Delete it or modify its structure

It's not that we *chose* two tables — it's that Supabase *requires* this pattern.
Every Supabase project in the world that needs custom user data uses this same two-table approach.

The good news: **from your app's point of view, you only work with `profiles`.**
You never query `auth.users` directly. The `profiles` table is your single source of truth for roles and user info.

---

## How Does a Profile Get Created Automatically?

When a new user signs up, we don't want to manually create a `profiles` row every time.
So we use a **database trigger**.

A trigger is a small function that runs automatically inside the database when something happens.

In HopeConnect, we have this trigger:

```
"When a new row is inserted into auth.users
 → automatically insert a matching row into profiles"
```

In plain English:
> Every time someone signs up, the database itself creates their profile row.
> No code in your app needs to do this — it just happens.

Here's a simplified version of what the trigger does:

```sql
-- When a new user is created in auth.users...
INSERT INTO profiles (id, full_name, role)
VALUES (
  new_user.id,                          -- same ID as auth.users
  new_user.metadata['full_name'],       -- name we passed during signup
  new_user.metadata['role']             -- role we passed during signup
);
```

---

## What Is a JWT Token?

When a user logs in, Supabase gives back a **JWT token** (JSON Web Token).

Think of it like a **theme park wristband**:
- The wristband proves you paid to enter
- Staff can look at it and know which rides you're allowed on
- It has an expiry time — after that, it's no longer valid

In HopeConnect:
- The frontend stores this token after login
- Every API request to our Express backend includes this token in the header
- The backend reads the token, verifies it with Supabase, and knows who you are and what role you have

No token = rejected. Wrong role = rejected.

---

## What Is Row Level Security (RLS)?

RLS is a PostgreSQL feature that controls **who can read or write each row** in a table.

Without RLS, if you query the `cases` table, you get **every case** from every user.
That's a big privacy problem — a social worker shouldn't see cases they didn't create.

With RLS, you write rules like:

```
"A social_worker can only SELECT rows from cases
 where the reported_by column matches their own user ID"
```

So even if a social worker tries to fetch all cases, the database automatically filters it
and only returns their own rows. The filtering happens inside the database itself.

In HopeConnect, we have RLS rules on all 5 tables:

| Table         | Admin       | NGO                        | Social Worker               |
|---------------|-------------|----------------------------|-----------------------------|
| profiles      | See all     | See own                    | See own                     |
| children      | See all     | See assigned cases' children | See own created children  |
| cases         | See all     | See assigned to them       | See own reported cases      |
| documents     | See all     | See assigned cases' docs   | See own cases' docs         |
| case_updates  | See all     | Read/write own updates     | Read only                   |

---

## The Full Flow When a User Logs In

Here is everything that happens, step by step:

```
1. User types email + password on the Login page

2. Frontend sends credentials to Supabase Auth
   → Supabase checks auth.users (hidden vault)
   → If correct, returns a JWT token + user ID

3. Frontend stores the token

4. Frontend fetches the user's profile from our `profiles` table
   using the user ID from the token
   → Gets: full_name, role, organization_name

5. React Router reads the role and redirects:
   admin        → /admin/dashboard
   ngo          → /ngo/dashboard
   social_worker → /social-worker/portal

6. When the user makes an API call (e.g. "load my cases"):
   → The JWT token is attached to the request header
   → Express backend receives the request
   → Middleware verifies the token with Supabase
   → Fetches the profile to confirm the role
   → Runs the database query (scoped to their role)
   → Returns only what they're allowed to see
```

---

## Summary in One Paragraph

Supabase has a built-in, hidden authentication system (`auth.users`) that handles
passwords and tokens — you cannot modify it. So every Supabase app creates a second
table (`profiles`) to store custom fields like role and name, linked by the same user ID.
A database trigger automatically creates the profile row whenever someone signs up.
JWT tokens act as wristbands that prove who the user is on every API request.
Row Level Security makes the database itself enforce what each role can see,
so the filtering is never left to chance in application code.

---

## Issues We Hit During Setup (and Why)

| Error | What Caused It | How We Fixed It |
|-------|---------------|-----------------|
| "type user_role already exists" | The schema SQL was run twice | Added `DROP TYPE IF EXISTS` at the top of the SQL so it's safe to re-run |
| "Email logins are disabled" | Email provider was accidentally turned off in Supabase dashboard | Re-enabled Email under Authentication → Sign In / Providers |
| "Invalid login credentials" | Users existed but emails were not confirmed | Ran SQL to set `email_confirmed_at`, and disabled "Confirm sign up" toggle |
| "Database error creating new user" | The trigger was crashing on an invalid enum cast | Rewrote the trigger with a safe `CASE` check and `EXCEPTION WHEN OTHERS` so it never blocks user creation |
| Port 5000 already in use | Old background Node process still running | Killed the old process with `Stop-Process` in PowerShell |
| Can't use `auth.create_user()` in SQL | That function doesn't exist in Supabase's SQL editor | Used the JavaScript SDK (`supabase.auth.admin.createUser`) in a seed script instead |

---

*HopeConnect — Phase 1 internal documentation*
