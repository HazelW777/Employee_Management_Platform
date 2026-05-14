import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, Mail } from "lucide-react";
import { signinSchema, forgotPasswordSchema } from "shared";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  signinThunk,
  selectAuthStatus,
  selectAuthError,
} from "@/store/auth.slice";
import {
  authService,
  type SigninInput,
  type ForgotPasswordInput,
} from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/api";

export default function SignIn() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector(selectAuthStatus);
  const authError = useAppSelector(selectAuthError);
  const isLoading = authStatus === "loading";

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const form = useForm<SigninInput>({
    resolver: zodResolver(signinSchema),
    defaultValues: { username: "", password: "" },
    mode: "onBlur",
  });

  const forgotForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: SigninInput) {
    const result = await dispatch(signinThunk(values));
    if (signinThunk.fulfilled.match(result)) {
      navigate(result.payload.role === "hr" ? "/hr/home" : "/employee/home");
    }
  }

  async function onForgotSubmit(values: ForgotPasswordInput) {
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authService.forgotPassword(values);
      setForgotSubmitted(true);
    } catch (err) {
      setForgotError(getApiErrorMessage(err));
    } finally {
      setForgotLoading(false);
    }
  }

  function handleForgotOpenChange(open: boolean) {
    setForgotOpen(open);
    if (!open) {
      forgotForm.reset();
      setForgotSubmitted(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[28rem] space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-h2 text-on-surface">Employee Management</h1>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-h3 text-on-surface">
              Sign in to your account
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
                            placeholder="Enter your username"
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
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-label-md text-on-surface">
                          Password
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => setForgotOpen(true)}
                          className="text-label-sm text-primary hover:underline leading-none"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {authError && (
                  <p className="text-sm font-medium text-destructive">
                    {authError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={handleForgotOpenChange}>
        <DialogContent>
          {forgotSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary-container">
                <Mail className="w-6 h-6 text-on-secondary-container" />
              </div>
              <DialogHeader>
                <DialogTitle>Check your email</DialogTitle>
                <DialogDescription className="text-body-sm">
                  We've sent a password reset link to your email address.
                </DialogDescription>
              </DialogHeader>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleForgotOpenChange(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reset your password</DialogTitle>
                <DialogDescription className="text-body-sm">
                  Enter the email address associated with your account and we'll
                  send you a reset link.
                </DialogDescription>
              </DialogHeader>

              <Form {...forgotForm}>
                <form
                  onSubmit={forgotForm.handleSubmit(onForgotSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={forgotForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-label-md text-on-surface">
                          Email address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                            <Input
                              type="email"
                              placeholder="you@company.com"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {forgotError && (
                    <p className="text-sm font-medium text-destructive">
                      {forgotError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={forgotLoading}
                      onClick={() => handleForgotOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? "Sending…" : "Send reset link"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
