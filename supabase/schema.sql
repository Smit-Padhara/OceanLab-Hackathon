-- ==========================================
-- TalentMash Supabase Schema Setup
-- ==========================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Profiles Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    college TEXT,
    branch TEXT,
    year TEXT,
    domain TEXT,
    skills TEXT[],
    interests TEXT,
    github_link TEXT,
    linkedin_link TEXT,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Connections Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sender_id, receiver_id),
    CHECK (sender_id != receiver_id)
);

-- ==========================================
-- 3. Communities Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT,
    skills_focus TEXT[],
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 4. Community Members Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.community_members (
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (community_id, user_id)
);

-- ==========================================
-- 5. Projects Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    description TEXT,
    required_skills TEXT[],
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 6. Project Requests Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

-- ==========================================
-- 7. Hackathons Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hackathons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 8. Messages Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- Row Level Security (RLS) Configuration
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view profiles, users can update their own
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Connections: Users can view their own connections, create new ones, update ones they received
CREATE POLICY "Users can view connections they are part of." ON public.connections FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send connection requests." ON public.connections FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can accept/reject connection requests." ON public.connections FOR UPDATE USING (auth.uid() = receiver_id);

-- Communities / Members: Viewable by all, insertable by auth users
CREATE POLICY "Communities are viewable by everyone." ON public.communities FOR SELECT USING (true);
CREATE POLICY "Any authenticated user can create a community." ON public.communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Members viewable by all." ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join communities." ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects / Requests: Viewable by all, insertable by auth users
CREATE POLICY "Projects are viewable by everyone." ON public.projects FOR SELECT USING (true);
CREATE POLICY "Any authenticated user can create a project." ON public.projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Project requests viewable by creator or requester." ON public.project_requests FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT creator_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Users can request to join projects." ON public.project_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Project creators can update request status." ON public.project_requests FOR UPDATE USING (
    auth.uid() IN (SELECT creator_id FROM public.projects WHERE id = project_id)
);

-- Hackathons: Viewable by all (Admin only inserts typically, keeping simple for now)
CREATE POLICY "Hackathons are viewable by everyone." ON public.hackathons FOR SELECT USING (true);

-- Messages: Users can only read/write messages they send or receive
CREATE POLICY "Users can read their own messages." ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ==========================================
-- Triggers for automatic matching or setup
-- ==========================================
-- Trigger function to automatically create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- Storage Buckets Setup
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE USING (auth.uid() = owner);
