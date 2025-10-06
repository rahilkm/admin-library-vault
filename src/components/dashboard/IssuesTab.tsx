import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, BookOpen, UserCheck } from "lucide-react";
import IssueBookModal from "./IssueBookModal";
import { format } from "date-fns";

interface BookIssue {
  id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: "issued" | "returned" | "overdue";
  books: {
    title: string;
    author: string;
    isbn: string;
  };
  members: {
    full_name: string;
    email: string;
  };
}

const IssuesTab = () => {
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchIssues = async () => {
    try {
      // FIX: Fetch all book issues with related book and member data using joins
      const { data, error } = await supabase
        .from("book_issues")
        .select(`
          *,
          books (title, author, isbn),
          members (full_name, email)
        `)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setIssues((data as BookIssue[]) || []);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast({
        title: "Error",
        description: "Failed to load book issues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();

    // FIX: Set up real-time subscription to automatically update UI when books are issued/returned
    const channel = supabase
      .channel("book_issues_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "book_issues",
        },
        () => {
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReturn = async (issueId: string) => {
    try {
      // FIX: Update status to 'returned' and set return_date
      // The database trigger will automatically increase book quantity
      const { error } = await supabase
        .from("book_issues")
        .update({
          status: "returned",
          return_date: new Date().toISOString(),
        })
        .eq("id", issueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book returned successfully",
      });

      fetchIssues();
    } catch (error) {
      console.error("Error returning book:", error);
      toast({
        title: "Error",
        description: "Failed to return book",
        variant: "destructive",
      });
    }
  };

  const filteredIssues = issues.filter(
    (issue) =>
      issue.books.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.members.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.books.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, dueDate: string) => {
    // Check if book is overdue
    if (status === "issued" && new Date(dueDate) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    switch (status) {
      case "issued":
        return <Badge variant="default">Issued</Badge>;
      case "returned":
        return <Badge variant="secondary">Returned</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by book title, author, or member name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <BookOpen className="mr-2 h-4 w-4" />
          Issue Book
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Return Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No book issues found
                </TableCell>
              </TableRow>
            ) : (
              filteredIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{issue.members.full_name}</span>
                      <span className="text-sm text-muted-foreground">{issue.members.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{issue.books.title}</TableCell>
                  <TableCell>{issue.books.author}</TableCell>
                  <TableCell>{format(new Date(issue.issue_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{format(new Date(issue.due_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    {issue.return_date
                      ? format(new Date(issue.return_date), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(issue.status, issue.due_date)}
                  </TableCell>
                  <TableCell>
                    {issue.status === "issued" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturn(issue.id)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IssueBookModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchIssues}
      />
    </div>
  );
};

export default IssuesTab;
