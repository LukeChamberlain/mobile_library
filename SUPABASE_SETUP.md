# Supabase setup for profiles

The website stores optional profile photos in a public Supabase Storage bucket. Anyone with a photo's URL can view it; the upload policy only lets a signed-in user upload into their own user-ID folder.

## Create the avatar bucket

In Supabase, open **SQL Editor** and run `supabase/migrations/20261117000000_create_avatars_bucket.sql`. This creates the `avatars` bucket and restricts uploads to JPG, PNG, and WebP files up to 2 MB.

## Enforce password requirements

In the Supabase dashboard, open the project's **Authentication** settings and set the password minimum length to **9**. Select the option requiring **lowercase letters, uppercase letters, numbers, and symbols**. The website also checks these rules and requires the confirmation field to match, while Supabase enforces the password strength when creating an account.

## Google profile information

Google sign-in requests the `openid`, `email`, and `profile` scopes. In Google Auth Platform, make sure `openid`, `userinfo.email`, and `userinfo.profile` are enabled in **Data Access**. Supabase returns the account's name, email, and profile photo when Google provides them.
