-- Create a table for user profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  updated_at timestamp with time zone
);

-- Create a table for documents
create table documents (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) not null,
  title text default 'Untitled Document',
  content jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table documents enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

create policy "Users can view own documents." on documents for select using ( auth.uid() = owner_id );
create policy "Users can insert own documents." on documents for insert with check ( auth.uid() = owner_id );
create policy "Users can update own documents." on documents for update using ( auth.uid() = owner_id );
create policy "Users can delete own documents." on documents for delete using ( auth.uid() = owner_id );
