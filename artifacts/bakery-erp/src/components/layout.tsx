import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useGetCurrentUser, useLogout, UserRole } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays, 
  Wallet, 
  PackageSearch,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  CreditCard,
  Gift,
  FileClock,
  History
} from "lucide-react";
import { LoadingSpinner } from "./ui/states";

type SharedLayoutProps = {
  children: React.ReactNode;
};

export function SharedLayout({ children }: SharedLayoutProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      queryKey: ['/api/auth/me'],
    }
  });

  const logoutMutation = useLogout();

  // Keep protected URLs inaccessible until the server confirms a valid session.
  // Using an effect avoids changing the route while React is rendering.
  React.useEffect(() => {
    const isLoginRoute = location === "/" || location === "/login";
    if (!isUserLoading && !user && !isLoginRoute) {
      setLocation("/");
    }
  }, [isUserLoading, location, setLocation, user]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        queryClient.clear();
        setLocation("/");
      }
    });
  };

  const navItems = [
    { name: "لوحة التحكم", path: "/dashboard", icon: LayoutDashboard },
    { name: "الموظفين", path: "/employees", icon: Users },
    { name: "الحضور والانصراف", path: "/attendance", icon: Clock },
    { name: "الإجازات", path: "/leaves", icon: CalendarDays },
    { name: "المكافآت والخصومات", path: "/bonuses-deductions", icon: Gift },
    { name: "السلف والأقساط", path: "/loans", icon: CreditCard },
    { name: "تسعيرة الإضافي", path: "/overtime", icon: FileClock },
    { name: "الرواتب", path: "/payroll", icon: Wallet },
    { name: "المستودع", path: "/warehouse", icon: PackageSearch },
    { name: "سجل العمليات", path: "/audit-log", icon: History },
    // Only GM can see users
    ...(user?.role === UserRole.general_manager ? [{ name: "إدارة النظام", path: "/users", icon: Settings }] : []),
    { name: "الإعدادات", path: "/settings", icon: Settings },
  ];

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // غير مسجّل — أظهر صفحة login فقط
  if (!user) {
    return <>{children}</>;
  }

  // مسجّل وعلى صفحة login — وجّهه للـ dashboard
  if (location === "/" || location === "/login") {
    setLocation("/dashboard");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex w-full">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-l border-sidebar-border h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar-primary/10">
          <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <span className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              م
            </span>
            <span>نظام المخبز</span>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="font-semibold text-sidebar-foreground truncate">{user.fullName}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            {user.role === UserRole.general_manager ? "مدير عام" : "مدير فرع"}
            {user.branchName && ` - ${user.branchName}`}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}>
                  <item.icon size={20} className={isActive ? "text-primary-foreground" : "text-sidebar-foreground/70"} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button 
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}</span>
          </button>
          
          <button 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 right-0 left-0 h-16 bg-sidebar border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-primary font-serif font-bold text-lg">
          <span className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            م
          </span>
          <span>نظام المخبز</span>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-foreground"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-background/80 backdrop-blur-sm pt-16">
          <div className="absolute top-16 right-0 bottom-0 w-64 bg-sidebar border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-200">
            <div className="px-4 py-4 border-b border-border">
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {user.role === UserRole.general_manager ? "مدير عام" : "مدير فرع"}
                {user.branchName && ` - ${user.branchName}`}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.path || location.startsWith(`${item.path}/`);
                return (
                  <Link key={item.path} href={item.path}>
                    <div 
                      className={`flex items-center gap-3 px-3 py-3 rounded-md ${
                        isActive 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "hover:bg-accent"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-border space-y-2">
              <button 
                onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-md hover:bg-accent"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                <span>{theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}</span>
              </button>
              
              <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-destructive hover:bg-destructive/10"
              >
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-16 h-[100dvh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
