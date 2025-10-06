-- Create book_issues table to track book lending
CREATE TABLE public.book_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  issue_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone NOT NULL,
  return_date timestamp with time zone,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on book_issues
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_issues
CREATE POLICY "Admins can view all book issues"
ON public.book_issues
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert book issues"
ON public.book_issues
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update book issues"
ON public.book_issues
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete book issues"
ON public.book_issues
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on book_issues
CREATE TRIGGER update_book_issues_updated_at
BEFORE UPDATE ON public.book_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to decrease book quantity when issuing
CREATE OR REPLACE FUNCTION public.decrease_book_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if book has available quantity
  IF (SELECT available_quantity FROM public.books WHERE id = NEW.book_id) <= 0 THEN
    RAISE EXCEPTION 'Book is out of stock';
  END IF;
  
  -- Decrease available quantity
  UPDATE public.books
  SET available_quantity = available_quantity - 1
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$;

-- Function to increase book quantity when returning
CREATE OR REPLACE FUNCTION public.increase_book_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increase if status changed from 'issued' to 'returned'
  IF OLD.status = 'issued' AND NEW.status = 'returned' THEN
    UPDATE public.books
    SET available_quantity = available_quantity + 1
    WHERE id = NEW.book_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to decrease quantity when book is issued
CREATE TRIGGER on_book_issue_decrease_quantity
BEFORE INSERT ON public.book_issues
FOR EACH ROW
WHEN (NEW.status = 'issued')
EXECUTE FUNCTION public.decrease_book_quantity();

-- Trigger to increase quantity when book is returned
CREATE TRIGGER on_book_return_increase_quantity
BEFORE UPDATE ON public.book_issues
FOR EACH ROW
EXECUTE FUNCTION public.increase_book_quantity();

-- Add index for better query performance
CREATE INDEX idx_book_issues_book_id ON public.book_issues(book_id);
CREATE INDEX idx_book_issues_member_id ON public.book_issues(member_id);
CREATE INDEX idx_book_issues_status ON public.book_issues(status);