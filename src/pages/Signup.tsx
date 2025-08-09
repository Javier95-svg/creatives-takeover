import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
});

type SignUpValues = z.infer<typeof signUpSchema>;

const Signup = () => {
  const { toast } = useToast();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: SignUpValues) => {
    // Placeholder action (no backend wired yet)
    console.log("Sign up submitted", values);
    toast({
      title: "Account created (demo)",
      description: "Thanks for signing up! We'll be in touch soon.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sign Up - Creatives Takeover</title>
        <meta name="description" content="Sign up to Creatives Takeover. Create your account with your full name, email, and a secure password." />
        <link rel="canonical" href="/signup" />
      </Helmet>
      <Navigation />
      <main className="container mx-auto px-6 pt-24 pb-16">
        <section className="max-w-md mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Sign Up</h1>
            <p className="mt-2 text-muted-foreground">Create your account to start building.</p>
          </header>

          <div className="rounded-lg border border-border bg-card shadow-sm p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex Johnson" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Create password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">Create account</Button>
              </form>
            </Form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
