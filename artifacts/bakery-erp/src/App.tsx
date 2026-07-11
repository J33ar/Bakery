import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { SharedLayout } from '@/components/layout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import EmployeesList from '@/pages/employees/index';
import NewEmployee from '@/pages/employees/new';
import EditEmployee from '@/pages/employees/edit';
import EmployeeDetail from '@/pages/employees/detail';
import Attendance from '@/pages/attendance';
import Leaves from '@/pages/leaves';
import Payroll from '@/pages/payroll';
import Warehouse from '@/pages/warehouse';
import BonusesDeductions from '@/pages/bonuses-deductions';
import Loans from '@/pages/loans';
import Overtime from '@/pages/overtime';
import AuditLog from '@/pages/audit-log';
import Users from '@/pages/users';
import Settings from '@/pages/settings';

const STORAGE_KEY = 'bakery_user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// استرجع بيانات المستخدم من localStorage عند بدء التطبيق
const storedUser = getStoredUser();
if (storedUser) {
  queryClient.setQueryData(['/api/auth/me'], storedUser);
}

function Router() {
  return (
    <SharedLayout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        
        <Route path="/employees" component={EmployeesList} />
        <Route path="/employees/new" component={NewEmployee} />
        <Route path="/employees/:id/edit" component={EditEmployee} />
        <Route path="/employees/:id" component={EmployeeDetail} />
        
        <Route path="/attendance" component={Attendance} />
        <Route path="/leaves" component={Leaves} />
        <Route path="/payroll" component={Payroll} />
        
        <Route path="/bonuses-deductions" component={BonusesDeductions} />
        <Route path="/loans" component={Loans} />
        <Route path="/overtime" component={Overtime} />
        
        <Route path="/warehouse" component={Warehouse} />
        <Route path="/audit-log" component={AuditLog} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        
        <Route component={NotFound} />
      </Switch>
    </SharedLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="bakery-erp-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
