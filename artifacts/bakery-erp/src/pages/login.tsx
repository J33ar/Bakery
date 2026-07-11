import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useListAuthBranches } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Wheat, Store, KeyRound, UserRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  branchId: z.string().optional()
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: branches, isLoading: isLoadingBranches } = useListAuthBranches();
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (userData) => {
        // حفظ الـ JWT token في localStorage
        const token = (userData as any).token;
        if (token) {
          localStorage.setItem('bakery_token', token);
        }
        // حفظ بيانات المستخدم في localStorage للـ refresh
        localStorage.setItem('bakery_user', JSON.stringify(userData));
        // نحفظ في الـ query cache مباشرة
        queryClient.setQueryData(['/api/auth/me'], userData);
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في نظام المخبز",
        });
        navigate("/dashboard");
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "فشل تسجيل الدخول",
          description: "تأكد من اسم المستخدم وكلمة المرور وصلاحيات الفرع",
        });
      }
    }
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      branchId: ""
    }
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      data: {
        username: data.username,
        password: data.password,
        branchId: data.branchId ? data.branchId : undefined,
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left/Hero Side */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <Wheat size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">نظام إدارة المخابز</h1>
          </div>
        </div>

        <div className="relative z-10 text-white max-w-md">
          <h2 className="text-4xl font-serif font-bold leading-tight mb-4 text-white">
            التحكم الكامل<br/>في كل رغيف وكل دينار.
          </h2>
          <p className="text-white/80 text-lg">
            منصة متكاملة لإدارة الموظفين، الحضور، الإجازات، المخزون والرواتب لفروع سحاب، النزهة، وطبربور.
          </p>
        </div>
      </div>

      {/* Right/Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center md:text-right">
            <div className="md:hidden flex justify-center mb-6 text-primary">
              <Wheat size={48} />
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">تسجيل الدخول</h2>
            <p className="text-muted-foreground">أدخل بيانات الاعتماد الخاصة بك للوصول إلى النظام</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <Input 
                            {...field} 
                            dir="ltr"
                            className="h-12 pl-4 pr-11 text-right border-primary/20 focus:border-primary focus:ring-primary/30 transition-all" 
                            placeholder="admin" 
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
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                          <Input 
                            {...field} 
                            type="password" 
                            dir="ltr"
                            className="h-12 pl-4 pr-11 text-right border-primary/20 focus:border-primary focus:ring-primary/30 transition-all" 
                            placeholder="••••••••" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      الفرع
                      <span className="text-xs text-muted-foreground font-normal">(لمديري الفروع فقط)</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 border-primary/20 focus:ring-primary/30">
                          <SelectValue placeholder="— مدير عام: اتركه فارغاً —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingBranches ? (
                          <div className="flex justify-center p-4"><Loader2 className="animate-spin w-4 h-4" /></div>
                        ) : (
                          branches?.map(branch => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-1"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  "دخول"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
