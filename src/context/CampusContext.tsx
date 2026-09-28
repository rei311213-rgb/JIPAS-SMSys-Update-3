import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Campus,
  getActiveCampus,
  setActiveCampus,
  filterStudentsByCampus,
  filterTeachersByCampus,
  filterBillsByCampus,
  filterPaymentsByCampus,
  filterExpensesByCampus,
  filterSummariesByCampus
} from '../lib/campusUtils';
import { Student, Teacher, StudentBill, PaymentRecord, SchoolExpenseRecord, SecretaryDailySummary } from '../types';

interface CampusContextType {
  selectedCampus: Campus;
  setSelectedCampus: (campus: Campus) => void;
  filterStudents: (students: Student[]) => Student[];
  filterTeachers: (teachers: Teacher[]) => Teacher[];
  filterBills: (bills: StudentBill[], students?: Student[]) => StudentBill[];
  filterPayments: (payments: PaymentRecord[], students?: Student[]) => PaymentRecord[];
  filterExpenses: (expenses: SchoolExpenseRecord[]) => SchoolExpenseRecord[];
  filterSummaries: (summaries: SecretaryDailySummary[]) => SecretaryDailySummary[];
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCampus, setSelectedCampusState] = useState<Campus>(() => getActiveCampus());

  useEffect(() => {
    const handleEvent = () => {
      setSelectedCampusState(getActiveCampus());
    };
    window.addEventListener('jipas_campus_changed', handleEvent);
    return () => window.removeEventListener('jipas_campus_changed', handleEvent);
  }, []);

  const handleSetSelectedCampus = (campus: Campus) => {
    setSelectedCampusState(campus);
    setActiveCampus(campus);
  };

  const value = useMemo<CampusContextType>(() => {
    return {
      selectedCampus,
      setSelectedCampus: handleSetSelectedCampus,
      filterStudents: (students: Student[]) => filterStudentsByCampus(students, selectedCampus),
      filterTeachers: (teachers: Teacher[]) => filterTeachersByCampus(teachers, selectedCampus),
      filterBills: (bills: StudentBill[], students?: Student[]) => filterBillsByCampus(bills, students || [], selectedCampus),
      filterPayments: (payments: PaymentRecord[], students?: Student[]) => filterPaymentsByCampus(payments, students || [], selectedCampus),
      filterExpenses: (expenses: SchoolExpenseRecord[]) => filterExpensesByCampus<SchoolExpenseRecord>(expenses, selectedCampus),
      filterSummaries: (summaries: SecretaryDailySummary[]) => filterSummariesByCampus<SecretaryDailySummary>(summaries, selectedCampus)
    };
  }, [selectedCampus]);

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

export const useCampus = (): CampusContextType => {
  const context = useContext(CampusContext);
  if (!context) {
    const active = getActiveCampus();
    return {
      selectedCampus: active,
      setSelectedCampus: (campus: Campus) => setActiveCampus(campus),
      filterStudents: (students: Student[]) => filterStudentsByCampus(students, active),
      filterTeachers: (teachers: Teacher[]) => filterTeachersByCampus(teachers, active),
      filterBills: (bills: StudentBill[], students?: Student[]) => filterBillsByCampus(bills, students || [], active),
      filterPayments: (payments: PaymentRecord[], students?: Student[]) => filterPaymentsByCampus(payments, students || [], active),
      filterExpenses: (expenses: SchoolExpenseRecord[]) => filterExpensesByCampus<SchoolExpenseRecord>(expenses, active),
      filterSummaries: (summaries: SecretaryDailySummary[]) => filterSummariesByCampus<SecretaryDailySummary>(summaries, active)
    };
  }
  return context;
};
