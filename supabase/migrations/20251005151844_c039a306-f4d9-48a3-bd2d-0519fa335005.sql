-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create admin_profiles table for admin user information
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on admin_profiles
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  published_year INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT positive_available CHECK (available_quantity >= 0),
  CONSTRAINT available_lte_quantity CHECK (available_quantity <= quantity)
);

-- Enable RLS on books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  membership_date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Enable RLS on members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (admins can manage roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_profiles
CREATE POLICY "Admins can view all admin profiles"
ON public.admin_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert admin profiles"
ON public.admin_profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin profiles"
ON public.admin_profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for books (admin only access)
CREATE POLICY "Admins can view all books"
ON public.books FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update books"
ON public.books FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete books"
ON public.books FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for members (admin only access)
CREATE POLICY "Admins can view all members"
ON public.members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert members"
ON public.members FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update members"
ON public.members FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create admin profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_admin_user();

-- Insert seed data for books
INSERT INTO public.books (title, author, isbn, category, published_year, quantity, available_quantity, description) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Classic Literature', 1925, 5, 5, 'A classic American novel set in the Jazz Age'),
('To Kill a Mockingbird', 'Harper Lee', '978-0060935467', 'Classic Literature', 1960, 3, 2, 'A gripping tale of racial injustice and childhood innocence'),
('1984', 'George Orwell', '978-0451524935', 'Dystopian Fiction', 1949, 4, 3, 'A dystopian social science fiction novel'),
('Pride and Prejudice', 'Jane Austen', '978-0141439518', 'Romance', 1813, 6, 6, 'A romantic novel of manners'),
('The Catcher in the Rye', 'J.D. Salinger', '978-0316769174', 'Coming-of-Age', 1951, 2, 1, 'A story about teenage rebellion and alienation'),
('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '978-0439708180', 'Fantasy', 1997, 8, 7, 'The first book in the Harry Potter series'),
('The Hobbit', 'J.R.R. Tolkien', '978-0547928227', 'Fantasy', 1937, 4, 4, 'A fantasy novel and children''s book'),
('Animal Farm', 'George Orwell', '978-0451526342', 'Political Satire', 1945, 3, 3, 'An allegorical novella about Soviet totalitarianism'),
('Brave New World', 'Aldous Huxley', '978-0060850524', 'Dystopian Fiction', 1932, 3, 2, 'A dystopian novel set in a futuristic World State'),
('The Lord of the Rings', 'J.R.R. Tolkien', '978-0544003415', 'Fantasy', 1954, 5, 4, 'An epic high-fantasy novel');

-- Insert seed data for members
INSERT INTO public.members (full_name, email, phone, address, status) VALUES
('John Smith', 'john.smith@email.com', '555-0101', '123 Main St, Springfield', 'active'),
('Sarah Johnson', 'sarah.j@email.com', '555-0102', '456 Oak Ave, Springfield', 'active'),
('Michael Brown', 'mbrown@email.com', '555-0103', '789 Pine Rd, Springfield', 'active'),
('Emily Davis', 'emily.davis@email.com', '555-0104', '321 Elm St, Springfield', 'active'),
('David Wilson', 'dwilson@email.com', '555-0105', '654 Maple Dr, Springfield', 'inactive'),
('Jennifer Martinez', 'jmartinez@email.com', '555-0106', '987 Cedar Ln, Springfield', 'active'),
('Robert Anderson', 'randerson@email.com', '555-0107', '147 Birch Way, Springfield', 'active'),
('Lisa Taylor', 'ltaylor@email.com', '555-0108', '258 Spruce Ct, Springfield', 'suspended');