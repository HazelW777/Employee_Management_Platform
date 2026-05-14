import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, CheckCircle, Eye, EyeOff, XCircle } from "lucide-react";
import { signupSchema } from "shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService, type SignupInput } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/api";

const token = new URLSearchParams(window.location.search).get("token") ?? "";

export default function SignUp() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) return;
    authService
      .validateInviteToken(token)
      .then(({ valid }) => {
        if (!valid) setLinkExpired(true);
      })
      .catch(() => setLinkExpired(true));
  }, []);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { token, username: "", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    setError(null);
    try {
      await authService.signup(values);
      setSubmitted(true);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      if (
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("invalid or expired")
      ) {
        setLinkExpired(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (linkExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[28rem] flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-h2 text-on-surface">This link has expired</h1>
            <p className="text-body-md text-on-surface-variant">
              This invitation link is no longer valid. Please contact your HR to
              request a new invitation.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[28rem] flex flex-col items-center gap-4 text-center">
          <h1 className="text-h2 text-on-surface">Invalid invitation link</h1>
          <p className="text-body-md text-on-surface-variant">
            This link is not valid. Please contact your HR to send you a new
            invitation.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[28rem] flex flex-col items-center gap-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary-container">
            <CheckCircle className="w-8 h-8 text-on-secondary-container" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-h2 text-on-surface">Account created</h1>
            <p className="text-body-md text-on-surface-variant">
              Your account has been created successfully.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => (window.location.href = "/")}
          >
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[28rem] space-y-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-h2 text-on-surface">Employee Management</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-h3 text-on-surface">
              Create your account
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-label-md text-on-surface">
                        Username
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Choose a username"
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel className="text-label-md text-on-surface">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                          >
                            {showPassword ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
