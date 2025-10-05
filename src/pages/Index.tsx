import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Library, Users, BookMarked } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-large">
            <BookOpen className="h-20 w-20 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Library Management System
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl">
            A comprehensive admin platform for managing books, members, and library operations with ease.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Admin Login
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8">
              Get Started
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="p-6 rounded-xl bg-card border shadow-medium hover:shadow-large transition-shadow">
              <div className="mb-4 p-3 rounded-lg bg-primary/10 w-fit">
                <Library className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Book Management</h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, and track all books with detailed information and availability status.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border shadow-medium hover:shadow-large transition-shadow">
              <div className="mb-4 p-3 rounded-lg bg-primary/10 w-fit">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Member Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage library members, track memberships, and monitor member status.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border shadow-medium hover:shadow-large transition-shadow">
              <div className="mb-4 p-3 rounded-lg bg-primary/10 w-fit">
                <BookMarked className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Search & Filter</h3>
              <p className="text-sm text-muted-foreground">
                Powerful search and filtering capabilities for quick access to information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
