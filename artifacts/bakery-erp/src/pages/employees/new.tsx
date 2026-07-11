import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateEmployee, 
  useListBranches, 
  useGetCurrentUser, 
  useListEmployees,
  UserRole,
  ContractType,
  EmployeeStatus 
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function NewEmployee() {
  const [, navigate] = useLocation();
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isGM = user?.role === UserRole.general_manager;

  const { data: branches } = useListBranches({
    query: { enabled: isGM, queryKey: ['branches'] }
  });

  const [formData, setFormData] = useState({
    fullName: "",
    employeeNumber: "",
    branchId: isGM ? "" : user?.branchId?.toString() || "",
    department: "",
    jobTitle: "",
    baseSalary: "",
    contractType: ContractType.full_time,
    hireDate: new Date().toISOString().split('T')[0],
    phone: "",
    nationalId: "",
    birthDate: "",
    address: "",
    status: EmployeeStatus.active
  });

  // ── real-time check للرقم الوظيفي ──
  const [empNumDebounced, setEmpNumDebounced] = useState("");
  const [empNumChecking, setEmpNumChecking] = useState(false);

  useEffect(() => {
    setEmpNumChecking(true);
    const t = setTimeout(() => {
      setEmpNumDebounced(formData.employeeNumber.trim());
      setEmpNumChecking(false);
    }, 500);
    return () => clearTimeout(t);
  }, [formData.employeeNumber]);

  const { data: existingEmployees } = useListEmployees(
    {},
    { query: { enabled: !!user, queryKey: ['employees-all-for-check'] } }
  );

  const isEmpNumTaken = empNumDebounced.length > 0 &&
    existingEmployees?.some(e => e.employeeNumber === empNumDebounced);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createEmployee = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم بنجاح", description: "تم إضافة الموظف الجديد" });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employees-all-for-check'] });
        navigate("/employees");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ" });
      }
    }
  });

  const handleSubmit = () => {
    if (!formData.fullName.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الاسم الكامل للموظف" });
      return;
    }
    if (!formData.employeeNumber.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الرقم الوظيفي" });
      return;
    }
    if (isEmpNumTaken) {
      toast({ variant: "destructive", title: "رقم مكرر", description: `الرقم الوظيفي "${formData.employeeNumber}" مستخدم بالفعل — يرجى اختيار رقم آخر` });
      return;
    }
    if (!formData.branchId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الفرع" });
      return;
    }
    if (!formData.department.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال اسم القسم" });
      return;
    }
    if (!formData.jobTitle.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال المسمى الوظيفي" });
      return;
    }
    if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الراتب الأساسي (أكبر من صفر)" });
      return;
    }
    if (!formData.hireDate) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى تحديد تاريخ التعيين" });
      return;
    }

    createEmployee.mutate({
      data: {
        fullName: formData.fullName,
        employeeNumber: formData.employeeNumber,
        branchId: formData.branchId,
        department: formData.department,
        jobTitle: formData.jobTitle,
        baseSalary: parseFloat(formData.baseSalary),
        contractType: formData.contractType as ContractType,
        hireDate: formData.hireDate,
        phone: formData.phone || undefined,
        nationalId: formData.nationalId || undefined,
        birthDate: formData.birthDate || undefined,
        address: formData.address || undefined,
        status: formData.status as EmployeeStatus
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="icon" onClick={() => navigate("/employees")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <PageHeader title="إضافة موظف جديد" description="إدخال بيانات الموظف في النظام" />
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="مثال: محمد أحمد علي" />
          </div>
          
          <div className="space-y-2">
            <Label>الرقم الوظيفي *</Label>
            <div className="relative">
              <Input
                name="employeeNumber"
                value={formData.employeeNumber}
                onChange={handleChange}
                dir="ltr"
                className={`text-right pl-9 ${isEmpNumTaken ? 'border-destructive focus-visible:ring-destructive' : empNumDebounced && !empNumChecking ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                placeholder="مثال: EMP-001"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {empNumChecking && formData.employeeNumber ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : isEmpNumTaken ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : empNumDebounced ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            </div>
            {isEmpNumTaken && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                هذا الرقم الوظيفي مستخدم بالفعل
              </p>
            )}
            {!isEmpNumTaken && empNumDebounced && !empNumChecking && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                الرقم الوظيفي متاح
              </p>
            )}
          </div>

          {isGM && (
            <div className="space-y-2">
              <Label>الفرع *</Label>
              <Select value={formData.branchId} onValueChange={(val) => handleSelectChange('branchId', val)}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>القسم *</Label>
            <Input name="department" value={formData.department} onChange={handleChange} placeholder="مثال: المالية" />
          </div>

          <div className="space-y-2">
            <Label>المسمى الوظيفي *</Label>
            <Input name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="مثال: محاسب" />
          </div>

          <div className="space-y-2">
            <Label>الراتب الأساسي *</Label>
            <Input type="number" min="0" step="0.01" name="baseSalary" value={formData.baseSalary} onChange={handleChange} dir="ltr" className="text-right" placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label>نوع العقد *</Label>
            <Select value={formData.contractType} onValueChange={(val) => handleSelectChange('contractType', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ContractType.full_time}>دوام كامل</SelectItem>
                <SelectItem value={ContractType.part_time}>دوام جزئي</SelectItem>
                <SelectItem value={ContractType.temporary}>مؤقت</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>تاريخ التعيين *</Label>
            <Input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label>رقم الهاتف</Label>
            <Input name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="text-right" placeholder="07XXXXXXXX" />
          </div>

          <div className="space-y-2">
            <Label>الرقم الوطني</Label>
            <Input name="nationalId" value={formData.nationalId} onChange={handleChange} dir="ltr" className="text-right" placeholder="XXXXXXXXXX" />
          </div>

          <div className="space-y-2">
            <Label>تاريخ الميلاد</Label>
            <Input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EmployeeStatus.active}>نشط</SelectItem>
                <SelectItem value={EmployeeStatus.suspended}>موقوف</SelectItem>
                <SelectItem value={EmployeeStatus.resigned}>مستقيل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>العنوان</Label>
            <Textarea name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="العنوان التفصيلي للموظف" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t p-4">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createEmployee.isPending || isEmpNumTaken}
            className="px-8"
          >
            {createEmployee.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الحفظ...</>
            ) : (
              "حفظ بيانات الموظف"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
