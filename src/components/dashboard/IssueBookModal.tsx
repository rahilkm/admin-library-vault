import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { addDays } from "date-fns";

interface Book {
  id: string;
  title: string;
  author: string;
  available_quantity: number;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
}

interface IssueBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const IssueBookModal = ({ open, onOpenChange, onSuccess }: IssueBookModalProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBooksAndMembers();
    }
  }, [open]);

  const fetchBooksAndMembers = async () => {
    try {
      // Fetch books with available quantity > 0
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("id, title, author, available_quantity")
        .gt("available_quantity", 0)
        .order("title");

      if (booksError) throw booksError;

      // Fetch active members
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, full_name, email")
        .eq("status", "active")
        .order("full_name");

      if (membersError) throw membersError;

      setBooks(booksData || []);
      setMembers(membersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load books and members",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBook || !selectedMember) {
      toast({
        title: "Validation Error",
        description: "Please select both a book and a member",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // FIX: Calculate due date (14 days from now)
      const dueDate = addDays(new Date(), 14);

      // FIX: Insert book issue - database trigger will automatically decrease book quantity
      // and prevent issuing if quantity is 0 (via the decrease_book_quantity function)
      const { error } = await supabase.from("book_issues").insert({
        book_id: selectedBook,
        member_id: selectedMember,
        due_date: dueDate.toISOString(),
        status: "issued",
      });

      if (error) {
        // FIX: Check if error is due to stock validation
        if (error.message.includes("out of stock")) {
          throw new Error("This book is currently out of stock");
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Book issued successfully",
      });

      onSuccess();
      onOpenChange(false);
      setSelectedBook("");
      setSelectedMember("");
    } catch (error: any) {
      console.error("Error issuing book:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to issue book",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member">Select Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger id="member">
                <SelectValue placeholder="Choose a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book">Select Book</Label>
            <Select value={selectedBook} onValueChange={setSelectedBook}>
              <SelectTrigger id="book">
                <SelectValue placeholder="Choose a book" />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title} by {book.author} (Available: {book.available_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {books.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No books available. All books are currently issued.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue Book
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueBookModal;
