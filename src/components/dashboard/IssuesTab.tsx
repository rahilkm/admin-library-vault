import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import IssueBookModal from "./IssueBookModal";
import { format } from "date-fns";

interface BookIssue {
  id: string;
  book_id: string;
  member_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
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
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Fetch all book issues with book and member details
  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("book_issues")
        .select(`
          *,
          books (title, author, isbn),
          members (full_name, email)
        `)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error: any) {
      toast.error("Error fetching book issues: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();

    // Real-time subscription to update when books are issued/returned
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

  // Handle book return - updates status and increases book quantity via trigger
  const handleReturn = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from("book_issues")
        .update({
          status: "returned",
          return_date: new Date().toISOString(),
        })
        .eq("id", issueId);

      if (error) throw error;

      toast.success("Book returned successfully. Quantity updated automatically.");
      fetchIssues();
    } catch (error: any) {
      toast.error("Error returning book: " + error.message);
    }
  };

  // Filter issues based on search term
  const filteredIssues = issues.filter(
    (issue) =>
      issue.books.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.books.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.members.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.members.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "returned") {
      return <Badge className="bg-green-600 hover:bg-green-700">Returned</Badge>;
    }
    
    const now = new Date();
    const due = new Date(dueDate);
    
    if (now > due) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return <Badge variant="secondary">Issued</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Book Issues</CardTitle>
              <CardDescription>
                Track all book issues and returns. Quantities update automatically.
              </CardDescription>
            </div>
            <Button onClick={() => setIsIssueModalOpen(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Issue Book
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by book, member name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Member Email</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No book issues found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.books.title}</TableCell>
                      <TableCell>{issue.books.author}</TableCell>
                      <TableCell>{issue.members.full_name}</TableCell>
                      <TableCell>{issue.members.email}</TableCell>
                      <TableCell>{format(new Date(issue.issue_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(issue.due_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {issue.return_date
                          ? format(new Date(issue.return_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(issue.status, issue.due_date)}</TableCell>
                      <TableCell>
                        {issue.status === "issued" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturn(issue.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
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
        </CardContent>
      </Card>

      <IssueBookModal
        open={isIssueModalOpen}
        onOpenChange={setIsIssueModalOpen}
        onSuccess={fetchIssues}
      />
    </div>
  );
};

export default IssuesTab;
