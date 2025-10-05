import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  published_year: number | null;
  quantity: number;
  available_quantity: number;
  description: string | null;
}

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onSuccess: () => void;
}

const BookModal = ({ isOpen, onClose, book, onSuccess }: BookModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    published_year: "",
    quantity: "1",
    available_quantity: "1",
    description: "",
  });

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        published_year: book.published_year?.toString() || "",
        quantity: book.quantity.toString(),
        available_quantity: book.available_quantity.toString(),
        description: book.description || "",
      });
    } else {
      setFormData({
        title: "",
        author: "",
        isbn: "",
        category: "",
        published_year: "",
        quantity: "1",
        available_quantity: "1",
        description: "",
      });
    }
  }, [book, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      isbn: formData.isbn.trim(),
      category: formData.category.trim(),
      published_year: formData.published_year ? parseInt(formData.published_year) : null,
      quantity: parseInt(formData.quantity),
      available_quantity: parseInt(formData.available_quantity),
      description: formData.description.trim() || null,
    };

    try {
      if (book) {
        const { error } = await supabase
          .from("books")
          .update(data)
          .eq("id", book.id);

        if (error) throw error;
        toast.success("Book updated successfully");
      } else {
        const { error } = await supabase.from("books").insert(data);

        if (error) throw error;
        toast.success("Book added successfully");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{book ? "Edit Book" : "Add New Book"}</DialogTitle>
          <DialogDescription>
            {book ? "Update book information" : "Add a new book to the library"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="isbn">ISBN *</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="published_year">Year</Label>
                <Input
                  id="published_year"
                  type="number"
                  value={formData.published_year}
                  onChange={(e) => setFormData({ ...formData, published_year: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Total Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="available_quantity">Available *</Label>
                <Input
                  id="available_quantity"
                  type="number"
                  min="0"
                  max={formData.quantity}
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {book ? "Update" : "Add"} Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookModal;
