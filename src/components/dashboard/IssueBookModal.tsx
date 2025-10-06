import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";

interface IssueBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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

const IssueBookModal = ({ open, onOpenChange, onSuccess }: IssueBookModalProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch available books (quantity > 0) and active members
  useEffect(() => {
    if (open) {
      fetchBooksAndMembers();
      // Set default due date to 14 days from now
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 14);
      setDueDate(defaultDueDate.toISOString().split("T")[0]);
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
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBook || !selectedMember || !dueDate) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: Insert will trigger decrease_book_quantity function automatically
      // This ensures atomic operation - either both insert and quantity decrease succeed, or both fail
      const { error } = await supabase.from("book_issues").insert({
        book_id: selectedBook,
        member_id: selectedMember,
        due_date: dueDate,
        status: "issued",
      });

      if (error) {
        // Handle out of stock error from trigger
        if (error.message.includes("out of stock")) {
          throw new Error("This book is currently out of stock");
        }
        throw error;
      }

      toast.success("Book issued successfully. Available quantity decreased automatically.");

      // Reset form
      setSelectedBook("");
      setSelectedMember("");
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 14);
      setDueDate(defaultDueDate.toISOString().split("T")[0]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
          <DialogDescription>
            Issue a book to a member. Quantity will be automatically decreased.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="book">Select Book</Label>
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger id="book">
                  <SelectValue placeholder="Choose a book" />
                </SelectTrigger>
                <SelectContent>
                  {books.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No books available</div>
                  ) : (
                    books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} by {book.author} (Available: {book.available_quantity})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="member">Select Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger id="member">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No active members</div>
                  ) : (
                    members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || books.length === 0 || members.length === 0}>
              {loading ? "Issuing..." : "Issue Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueBookModal;
