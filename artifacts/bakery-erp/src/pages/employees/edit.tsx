import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetEmployee,
  useUpdateEmployee, 
  useListBranches, 
  useGetCurrentUser, 
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
import { ArrowRight } from "lucide-react";
import { FullScreenLoader, ErrorState } from "@/components/ui/states";

export default function EditEmployee() {
  const [, navigate] = useLocation();
  const params = useParams();
  const id = params.id || "";
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isGM = user?.role === UserRole.general_manager;

  const { data: branches } = useListBranches({
    query: { enabled: isGM, queryKey: ['branches'] }
  });

  const { data: employee, isLoading, isError, refetch } = useGetEmployee(
    id,
    { query: { enabled: !!id, queryKey: ['employee', id] } }
  );

  const [formData, setFormData] = useState<{
    fullName: string; employeeNumber: string; branchId: string;
    department: string; jobTitle: string; baseSalary: string;
    contractType: string; hireDate: string; phone: string;
    nationalId: string; birthDate: string; address: string; status: string;
  }>({
    fullName: "",
    employeeNumber: "",
    branchId: "",
    department: "",
    jobTitle: "",
    baseSalary: "",
    contractType: ContractType.full_time,
    hireDate: "",
    phone: "",
    nationalId: "",
    birthDate: "",
    address: "",
    status: EmployeeStatus.active
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        branchId: employee.branchId.toString(),
        department: employee.department,
        jobTitle: employee.jobTitle,
        baseSalary: employee.baseSalary.toString(),
        contractType: employee.contractType as ContractType,
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : "",
        phone: employee.phone || "",
        nationalId: employee.nationalId || "",
        birthDate: employee.birthDate ? new Date(employee.birthDate).toISOString().split('T')[0] : "",
        address: employee.address || "",
        status: employee.status as EmployeeStatus
      });
    }
  }, [employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateEmployee = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم بنجاح", description: "تم تحديث الموظف" });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee', id] });
        queryClient.invalidateQueries({ queryKey: ['employee-full-record', id] });
        navigate(`/employees/${id}`);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الاسم الكامل للموظف" });
      return;
    }
    if (!formData.employeeNumber.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الرقم الوظيفي" });
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

    updateEmployee.mutate({
      id,
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

  if (isLoading) return <FullScreenLoader />;
  if (isError || !employee) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="icon" onClick={() => navigate(`/employees/${id}`)}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <PageHeader title="تعديل الموظف" description="تحديث بيانات الموظف" />
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="مثال: محمد أحمد علي" />
            </div>
            
            <div className="space-y-2">
              <Label>الرقم الوظيفي *</Label>
              <Input name="employeeNumber" value={formData.employeeNumber} onChange={handleChange} dir="ltr" className="text-right" placeholder="مثال: EMP-001" />
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
              <Input name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="text-right" />
            </div>

            <div className="space-y-2">
              <Label>الرقم الوطني</Label>
              <Input name="nationalId" value={formData.nationalId} onChange={handleChange} dir="ltr" className="text-right" />
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
              <Textarea name="address" value={formData.address} onChange={handleChange} rows={2} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-4">
            <Button type="button" onClick={handleSubmit as any} disabled={updateEmployee.isPending} className="px-8">
              {updateEmployee.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
