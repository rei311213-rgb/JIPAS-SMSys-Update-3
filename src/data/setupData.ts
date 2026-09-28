import { AcademicYearItem, TermItem, DepartmentItem, ClassItem, HouseItem, SubjectItem, CourseItem } from '../types';

export const INITIAL_ACADEMIC_YEARS: AcademicYearItem[] = [
  {
    id: 'ay-1',
    name: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-07-26',
    status: 'Current',
    hasRecords: true
  },
  {
    id: 'ay-2',
    name: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-07-24',
    status: 'Upcoming',
    hasRecords: true
  },
  {
    id: 'ay-3',
    name: '2027-2028',
    startDate: '2027-09-01',
    endDate: '2028-07-24',
    status: 'Upcoming',
    hasRecords: false
  },
  {
    id: 'ay-4',
    name: '2024-2025',
    startDate: '2024-09-02',
    endDate: '2025-07-25',
    status: 'Completed',
    hasRecords: true
  }
];

export const INITIAL_TERMS: TermItem[] = [
  {
    id: 'term-1',
    academicYear: '2025-2026',
    name: 'First Term',
    startDate: '2025-01-10',
    endDate: '2025-04-05',
    daysOpen: 60,
    nextTermDate: '2025-04-25',
    holidays: 2,
    status: 'Completed'
  },
  {
    id: 'term-2',
    academicYear: '2025-2026',
    name: 'Second Term',
    startDate: '2025-04-25',
    endDate: '2025-07-20',
    daysOpen: 60,
    nextTermDate: '2025-09-01',
    holidays: 1,
    status: 'Completed'
  },
  {
    id: 'term-3',
    academicYear: '2025-2026',
    name: 'Third Term',
    startDate: '2026-04-21',
    endDate: '2026-07-23',
    daysOpen: 65,
    nextTermDate: '2026-09-08',
    holidays: 3,
    status: 'Current'
  },
  {
    id: 'term-4',
    academicYear: '2026-2027',
    name: 'First Term',
    startDate: '2026-09-08',
    endDate: '2026-12-15',
    daysOpen: 65,
    nextTermDate: '2027-01-10',
    holidays: 2,
    status: 'Upcoming'
  },
  {
    id: 'term-5',
    academicYear: '2026-2027',
    name: 'Second Term',
    startDate: '2027-01-10',
    endDate: '2027-04-08',
    daysOpen: 62,
    nextTermDate: '2027-04-26',
    holidays: 3,
    status: 'Upcoming'
  },
  {
    id: 'term-6',
    academicYear: '2026-2027',
    name: 'Third Term',
    startDate: '2027-04-26',
    endDate: '2027-07-22',
    daysOpen: 64,
    nextTermDate: '2027-09-07',
    holidays: 1,
    status: 'Upcoming'
  }
];

export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept-1',
    name: 'Pre-School',
    code: 'PRE',
    description: 'Early Childhood Education (Creche, Nursery 1, Nursery 2, KG 1, KG 2)',
    headOfDept: 'Mrs. Abigail Mensah',
    subDepartments: ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2']
  },
  {
    id: 'dept-2',
    name: 'Primary School',
    code: 'PRI',
    description: 'Lower and Upper Primary (Basic 1 to Basic 6)',
    headOfDept: 'Mr. Emmanuel Tetteh',
    subDepartments: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6']
  },
  {
    id: 'dept-3',
    name: 'Junior High School',
    code: 'JHS',
    description: 'Basic 7 to Basic 9 (JHS 1 to JHS 3) BECE Examination Stream',
    headOfDept: 'Mr. Paul Denyo',
    subDepartments: ['JHS 1', 'JHS 2', 'JHS 3']
  },
  {
    id: 'dept-shs',
    name: 'Senior High School',
    code: 'SHS',
    description: 'Senior High School Department across SHS 1, SHS 2, and SHS 3 Programmes',
    headOfDept: 'Dr. Kwame Boateng',
    subDepartments: ['General Science', 'General Arts', 'Business', 'Visual & Performing Arts', 'Home Economics']
  }
];

export const INITIAL_SHS_COURSES: CourseItem[] = [
  {
    id: 'crs-1',
    name: 'General Science',
    code: 'SCI',
    department: 'Senior High School',
    description: 'General Science Programme across SHS 1, SHS 2, SHS 3',
    coreSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health'],
    electiveSubjects: ['Biology', 'Chemistry', 'Physics', 'Additional Mathematics', 'Computing', 'ICT', 'Geography', 'Economics', 'Agricultural Science', 'French', 'Ghanaian Language', 'Arabic', 'Government', 'History', 'Literature in English', 'Religious and Moral Education'],
    headOfCourse: 'Dr. Kwame Boateng',
    durationYears: 3,
    classesGenerated: ['General Science 1', 'General Science 2', 'General Science 3']
  },
  {
    id: 'crs-2',
    name: 'General Arts',
    code: 'G-ART',
    department: 'Senior High School',
    description: 'General Arts Programme across SHS 1, SHS 2, SHS 3',
    coreSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health'],
    electiveSubjects: ['Economics', 'Geography', 'Government', 'History', 'Literature in English', 'Ghanaian Language', 'French', 'Arabic', 'Spanish', 'Religious and Moral Education', 'Business Management', 'Accounting', 'ICT', 'Computer Science', 'Biology', 'Chemistry', 'Physics', 'Additional Mathematics', 'Agricultural Science', 'Art and Design', 'Performing Arts'],
    headOfCourse: 'Mr. Paul Denyo',
    durationYears: 3,
    classesGenerated: ['General Arts 1', 'General Arts 2', 'General Arts 3']
  },
  {
    id: 'crs-3',
    name: 'Business',
    code: 'BUS',
    department: 'Senior High School',
    description: 'Business Programme across SHS 1, SHS 2, SHS 3',
    coreSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health'],
    electiveSubjects: ['Business Management', 'Accounting', 'Economics', 'Computer Science', 'ICT', 'Additional Mathematics', 'French', 'Arabic', 'Ghanaian Language', 'Geography', 'Government', 'History', 'Literature in English', 'Religious and Moral Education', 'Biology', 'Chemistry', 'Physics', 'Food and Nutrition', 'Clothing and Textiles', 'Management in Living', 'Art and Design', 'Performing Arts'],
    headOfCourse: 'Mr. Emmanuel Tetteh',
    durationYears: 3,
    classesGenerated: ['Business 1', 'Business 2', 'Business 3']
  },
  {
    id: 'crs-4',
    name: 'Visual & Performing Arts',
    code: 'VPA',
    department: 'Senior High School',
    description: 'Visual & Performing Arts Programme across SHS 1, SHS 2, SHS 3',
    coreSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health'],
    electiveSubjects: ['Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music', 'Management in Living', 'Food and Nutrition', 'Clothing and Textiles', 'History', 'Literature in English', 'Ghanaian Language', 'Arabic', 'French', 'Business Management', 'Accounting', 'Economics', 'Government', 'Geography', 'Biology', 'Chemistry', 'Physics', 'Additional Mathematics', 'Computing', 'ICT', 'Agricultural Science', 'Religious and Moral Education'],
    headOfCourse: 'Madam Grace Donkor',
    durationYears: 3,
    classesGenerated: ['Visual & Performing Arts 1', 'Visual & Performing Arts 2', 'Visual & Performing Arts 3']
  },
  {
    id: 'crs-5',
    name: 'Home Economics',
    code: 'HEC',
    department: 'Senior High School',
    description: 'Home Economics Programme across SHS 1, SHS 2, SHS 3',
    coreSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health'],
    electiveSubjects: ['Management in Living', 'Food and Nutrition', 'Clothing and Textiles', 'Biology', 'Chemistry', 'Art and Design Foundation', 'Art and Design Studio', 'Performing Arts', 'Physics', 'Additional Mathematics', 'Computing', 'ICT', 'Economics', 'Agricultural Science', 'Arabic', 'French', 'Ghanaian Language', 'Business Management', 'Accounting', 'Geography', 'Government', 'History', 'Religious and Moral Education', 'Literature in English'],
    headOfCourse: 'Mrs. Patience Osei',
    durationYears: 3,
    classesGenerated: ['Home Economics 1', 'Home Economics 2', 'Home Economics 3']
  }
];

export const INITIAL_CLASSES: ClassItem[] = [
  // 1. Pre-School
  { 
    id: 'cls-ps-cre', 
    name: 'Creche', 
    department: 'Pre-School', 
    capacity: 20, 
    status: 'Active', 
    classTeacher: 'Mrs. Abigail Mensah', 
    roomNumber: 'PS-1',
    assignedSubjects: ['Language & Literacy', 'Numeracy', 'Creative Arts', 'Our World & Environmental Awareness', 'Physical Development', 'Personal, Social & Emotional Development', 'Religious/Moral & Values Education']
  },
  { 
    id: 'cls-ps-n1', 
    name: 'Nursery 1', 
    department: 'Pre-School', 
    capacity: 25, 
    status: 'Active', 
    classTeacher: 'Mrs. Linda Appiah', 
    roomNumber: 'PS-2',
    assignedSubjects: ['Language & Literacy', 'Numeracy', 'Creative Arts', 'Our World & Environmental Awareness', 'Physical Development', 'Personal, Social & Emotional Development', 'Religious/Moral & Values Education']
  },
  { 
    id: 'cls-ps-n2', 
    name: 'Nursery 2', 
    department: 'Pre-School', 
    capacity: 25, 
    status: 'Active', 
    classTeacher: 'Madam Serwaa Akoto', 
    roomNumber: 'PS-3',
    assignedSubjects: ['Language & Literacy', 'Numeracy', 'Creative Arts', 'Our World & Environmental Awareness', 'Physical Development', 'Personal, Social & Emotional Development', 'Religious/Moral & Values Education']
  },
  { 
    id: 'cls-ps-k1', 
    name: 'KG 1', 
    department: 'Pre-School', 
    capacity: 30, 
    status: 'Active', 
    classTeacher: 'Mrs. Dora Quaye', 
    roomNumber: 'PS-4',
    assignedSubjects: ['Language & Literacy', 'Numeracy', 'Our World and Our People', 'Creative Arts', 'Physical Development', 'Religious/Moral & Values Education']
  },
  { 
    id: 'cls-ps-k2', 
    name: 'KG 2', 
    department: 'Pre-School', 
    capacity: 30, 
    status: 'Active', 
    classTeacher: 'Mrs. Evelyn Mensah', 
    roomNumber: 'PS-5',
    assignedSubjects: ['Language & Literacy', 'Numeracy', 'Our World and Our People', 'Creative Arts', 'Physical Development', 'Religious/Moral & Values Education']
  },
  
  // 2. Primary
  { 
    id: 'cls-pri-b1', 
    name: 'Basic 1', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mr. Emmanuel Tetteh', 
    roomNumber: 'P-1',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  { 
    id: 'cls-pri-b2', 
    name: 'Basic 2', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Madam Beatrice Addo', 
    roomNumber: 'P-2',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  { 
    id: 'cls-pri-b3', 
    name: 'Basic 3', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mr. Samuel Odoom', 
    roomNumber: 'P-3',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  { 
    id: 'cls-pri-b4', 
    name: 'Basic 4', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mrs. Comfort Nyarko', 
    roomNumber: 'P-4',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  { 
    id: 'cls-pri-b5', 
    name: 'Basic 5', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mr. Daniel Kwarteng', 
    roomNumber: 'P-5',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  { 
    id: 'cls-pri-b6', 
    name: 'Basic 6', 
    department: 'Primary School', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mrs. Janet Frimpong', 
    roomNumber: 'P-6',
    assignedSubjects: ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing']
  },
  
  // 3. JHS
  { 
    id: 'cls-jhs-1', 
    name: 'JHS 1', 
    department: 'Junior High School', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Paul Denyo', 
    roomNumber: 'J-1',
    assignedSubjects: ['English Language', 'Mathematics', 'Science', 'Social Studies', 'Computing', 'Career Technology', 'Creative Arts and Design', 'Religious and Moral Education', 'Physical Education and Health', 'Ghanaian Language', 'French Language', 'Arabic']
  },
  { 
    id: 'cls-jhs-2', 
    name: 'JHS 2', 
    department: 'Junior High School', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. George Ofori', 
    roomNumber: 'J-2',
    assignedSubjects: ['English Language', 'Mathematics', 'Science', 'Social Studies', 'Computing', 'Career Technology', 'Creative Arts and Design', 'Religious and Moral Education', 'Physical Education and Health', 'Ghanaian Language', 'French Language', 'Arabic']
  },
  { 
    id: 'cls-jhs-3', 
    name: 'JHS 3', 
    department: 'Junior High School', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Madam Rebecca Amponsah', 
    roomNumber: 'J-3',
    assignedSubjects: ['English Language', 'Mathematics', 'Science', 'Social Studies', 'Computing', 'Career Technology', 'Creative Arts and Design', 'Religious and Moral Education', 'Physical Education and Health', 'Ghanaian Language', 'French Language', 'Arabic']
  },

  // 4. SHS (General Science)
  { 
    id: 'cls-shs-sci-1', 
    name: 'General Science 1', 
    department: 'Senior High School', 
    course: 'General Science', 
    level: '1', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Dr. Kwame Boateng', 
    roomNumber: 'S-1',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Biology', 'Chemistry', 'Physics', 'Additional Mathematics']
  },
  { 
    id: 'cls-shs-sci-2', 
    name: 'General Science 2', 
    department: 'Senior High School', 
    course: 'General Science', 
    level: '2', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Dr. Kwame Boateng', 
    roomNumber: 'S-2',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Biology', 'Chemistry', 'Physics', 'Additional Mathematics']
  },
  { 
    id: 'cls-shs-sci-3', 
    name: 'General Science 3', 
    department: 'Senior High School', 
    course: 'General Science', 
    level: '3', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Dr. Kwame Boateng', 
    roomNumber: 'S-3',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Biology', 'Chemistry', 'Physics', 'Additional Mathematics']
  },

  // SHS (General Arts)
  { 
    id: 'cls-shs-art-1', 
    name: 'General Arts 1', 
    department: 'Senior High School', 
    course: 'General Arts', 
    level: '1', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Paul Denyo', 
    roomNumber: 'S-4',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Economics', 'Geography', 'Government', 'History', 'Literature in English']
  },
  { 
    id: 'cls-shs-art-2', 
    name: 'General Arts 2', 
    department: 'Senior High School', 
    course: 'General Arts', 
    level: '2', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Paul Denyo', 
    roomNumber: 'S-5',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Economics', 'Geography', 'Government', 'History', 'Literature in English']
  },
  { 
    id: 'cls-shs-art-3', 
    name: 'General Arts 3', 
    department: 'Senior High School', 
    course: 'General Arts', 
    level: '3', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Paul Denyo', 
    roomNumber: 'S-6',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Economics', 'Geography', 'Government', 'History', 'Literature in English']
  },

  // SHS (Business)
  { 
    id: 'cls-shs-bus-1', 
    name: 'Business 1', 
    department: 'Senior High School', 
    course: 'Business', 
    level: '1', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Emmanuel Tetteh', 
    roomNumber: 'S-7',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Business Management', 'Accounting', 'Economics']
  },
  { 
    id: 'cls-shs-bus-2', 
    name: 'Business 2', 
    department: 'Senior High School', 
    course: 'Business', 
    level: '2', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Emmanuel Tetteh', 
    roomNumber: 'S-8',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Business Management', 'Accounting', 'Economics']
  },
  { 
    id: 'cls-shs-bus-3', 
    name: 'Business 3', 
    department: 'Senior High School', 
    course: 'Business', 
    level: '3', 
    capacity: 40, 
    status: 'Active', 
    classTeacher: 'Mr. Emmanuel Tetteh', 
    roomNumber: 'S-9',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Business Management', 'Accounting', 'Economics']
  },

  // SHS (Visual & Performing Arts)
  { 
    id: 'cls-shs-vpa-1', 
    name: 'Visual & Performing Arts 1', 
    department: 'Senior High School', 
    course: 'Visual & Performing Arts', 
    level: '1', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Madam Grace Donkor', 
    roomNumber: 'S-10',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music']
  },
  { 
    id: 'cls-shs-vpa-2', 
    name: 'Visual & Performing Arts 2', 
    department: 'Senior High School', 
    course: 'Visual & Performing Arts', 
    level: '2', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Madam Grace Donkor', 
    roomNumber: 'S-11',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music']
  },
  { 
    id: 'cls-shs-vpa-3', 
    name: 'Visual & Performing Arts 3', 
    department: 'Senior High School', 
    course: 'Visual & Performing Arts', 
    level: '3', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Madam Grace Donkor', 
    roomNumber: 'S-12',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Art and Design Foundation', 'Art and Design Studio', 'Design and Communication Technology', 'Performing Arts', 'Music']
  },

  // SHS (Home Economics)
  { 
    id: 'cls-shs-he-1', 
    name: 'Home Economics 1', 
    department: 'Senior High School', 
    course: 'Home Economics', 
    level: '1', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mrs. Patience Osei', 
    roomNumber: 'S-13',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Management in Living', 'Food and Nutrition', 'Clothing and Textiles']
  },
  { 
    id: 'cls-shs-he-2', 
    name: 'Home Economics 2', 
    department: 'Senior High School', 
    course: 'Home Economics', 
    level: '2', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mrs. Patience Osei', 
    roomNumber: 'S-14',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Management in Living', 'Food and Nutrition', 'Clothing and Textiles']
  },
  { 
    id: 'cls-shs-he-3', 
    name: 'Home Economics 3', 
    department: 'Senior High School', 
    course: 'Home Economics', 
    level: '3', 
    capacity: 35, 
    status: 'Active', 
    classTeacher: 'Mrs. Patience Osei', 
    roomNumber: 'S-15',
    assignedSubjects: ['English Language', 'Mathematics', 'Social Studies', 'General Science', 'Physical Education and Health', 'Management in Living', 'Food and Nutrition', 'Clothing and Textiles']
  }
];

export function validateMasterStructure(classes: ClassItem[], subjects: SubjectItem[]): { valid: boolean; orphanSubjects: string[] } {
  const subjectNames = new Set(subjects.map(s => s.name));
  const orphanSubjects: string[] = [];

  for (const cls of classes) {
    if (cls.assignedSubjects) {
      for (const subj of cls.assignedSubjects) {
        if (!subjectNames.has(subj)) {
          orphanSubjects.push(`${subj} (assigned to class ${cls.name})`);
        }
      }
    }
  }

  return {
    valid: orphanSubjects.length === 0,
    orphanSubjects
  };
}

export const INITIAL_HOUSES: HouseItem[] = [
  {
    id: 'house-1',
    name: 'Blue House',
    color: '#2563eb',
    master: 'Mr. Evans Lamptey',
    patron: 'School Board of Governors',
    motto: 'Truth, Integrity and Diligence'
  },
  {
    id: 'house-2',
    name: 'Green House',
    color: '#16a34a',
    master: 'Mrs. Sophia Addo',
    patron: 'PTA Executive Council',
    motto: 'Growth, Honor and Fruitfulness'
  },
  {
    id: 'house-3',
    name: 'Yellow House',
    color: '#ca8a04',
    master: 'Mr. Dominic Frimpong',
    patron: 'Old Students Association',
    motto: 'Light, Wisdom and Excellence'
  },
  {
    id: 'house-4',
    name: 'Red House',
    color: '#dc2626',
    master: 'Mr. Isaac K. Donkor',
    patron: 'Academic Board',
    motto: 'Valor, Courage and Victory'
  }
];

export const INITIAL_SUBJECTS: SubjectItem[] = [
  // 1. Pre-School (Creche, Nursery 1, Nursery 2, KG 1, KG 2)
  { id: 'sub-ps-ll', name: 'Language & Literacy', code: 'PS-LL', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-num', name: 'Numeracy', code: 'PS-NUM', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-ca', name: 'Creative Arts', code: 'PS-CA', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-ow', name: 'Our World & Environmental Awareness', code: 'PS-OWE', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-owp', name: 'Our World and Our People', code: 'PS-OWP', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-pd', name: 'Physical Development', code: 'PS-PD', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-pse', name: 'Personal, Social & Emotional Development', code: 'PS-PSE', department: 'Pre-School', category: 'Core' },
  { id: 'sub-ps-rmv', name: 'Religious/Moral & Values Education', code: 'PS-RMV', department: 'Pre-School', category: 'Core' },

  // 2. Primary School (Basic 1 - Basic 6)
  { id: 'sub-pri-eng', name: 'English Language', code: 'PRI-ENG', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-gha', name: 'Ghanaian Language', code: 'PRI-GHA', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-mat', name: 'Mathematics', code: 'PRI-MAT', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-sci', name: 'Science', code: 'PRI-SCI', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-hist', name: 'History', code: 'PRI-HIST', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-ca', name: 'Creative Arts', code: 'PRI-CA', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-rme', name: 'Religious and Moral Education', code: 'PRI-RME', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-pe', name: 'Physical Education', code: 'PRI-PE', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-fre', name: 'French', code: 'PRI-FRE', department: 'Primary School', category: 'Core' },
  { id: 'sub-pri-comp', name: 'Computing', code: 'PRI-COMP', department: 'Primary School', category: 'Core' },

  // 3. Junior High School (JHS 1 - JHS 3)
  { id: 'sub-jhs-eng', name: 'English Language', code: 'JHS-ENG', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-mat', name: 'Mathematics', code: 'JHS-MAT', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-sci', name: 'Science', code: 'JHS-SCI', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-soc', name: 'Social Studies', code: 'JHS-SOC', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-comp', name: 'Computing', code: 'JHS-COMP', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-tech', name: 'Career Technology', code: 'JHS-TECH', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-cad', name: 'Creative Arts and Design', code: 'JHS-CAD', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-rme', name: 'Religious and Moral Education', code: 'JHS-RME', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-peh', name: 'Physical Education and Health', code: 'JHS-PEH', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-gha', name: 'Ghanaian Language', code: 'JHS-GHA', department: 'Junior High School', category: 'Core' },
  { id: 'sub-jhs-fre', name: 'French Language', code: 'JHS-FRE', department: 'Junior High School', category: 'Elective' },
  { id: 'sub-jhs-ara', name: 'Arabic', code: 'JHS-ARA', department: 'Junior High School', category: 'Elective' },

  // 4. Senior High School (General Science)
  { id: 'sub-shs-sci-core-eng', name: 'English Language', code: 'SHS-SCI-ENG', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-sci-core-mat', name: 'Mathematics', code: 'SHS-SCI-MAT', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-sci-core-soc', name: 'Social Studies', code: 'SHS-SCI-SOC', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-sci-core-sci', name: 'General Science', code: 'SHS-SCI-SCI', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-sci-core-peh', name: 'Physical Education and Health', code: 'SHS-SCI-PEH', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-sci-bio', name: 'Biology', code: 'SHS-SCI-BIO', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-sci-chem', name: 'Chemistry', code: 'SHS-SCI-CHEM', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-sci-phys', name: 'Physics', code: 'SHS-SCI-PHYS', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-sci-addmat', name: 'Additional Mathematics', code: 'SHS-SCI-AMAT', department: 'Senior High School', category: 'Elective' },

  // SHS (General Arts)
  { id: 'sub-shs-art-core-eng', name: 'English Language', code: 'SHS-ART-ENG', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-art-core-mat', name: 'Mathematics', code: 'SHS-ART-MAT', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-art-core-soc', name: 'Social Studies', code: 'SHS-ART-SOC', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-art-core-sci', name: 'General Science', code: 'SHS-ART-SCI', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-art-core-peh', name: 'Physical Education and Health', code: 'SHS-ART-PEH', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-art-econ', name: 'Economics', code: 'SHS-ART-ECON', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-art-geog', name: 'Geography', code: 'SHS-ART-GEOG', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-art-govt', name: 'Government', code: 'SHS-ART-GOVT', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-art-hist', name: 'History', code: 'SHS-ART-HIST', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-art-lit', name: 'Literature in English', code: 'SHS-ART-LIT', department: 'Senior High School', category: 'Elective' },

  // SHS (Business)
  { id: 'sub-shs-bus-core-eng', name: 'English Language', code: 'SHS-BUS-ENG', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-bus-core-mat', name: 'Mathematics', code: 'SHS-BUS-MAT', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-bus-core-soc', name: 'Social Studies', code: 'SHS-BUS-SOC', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-bus-core-sci', name: 'General Science', code: 'SHS-BUS-SCI', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-bus-core-peh', name: 'Physical Education and Health', code: 'SHS-BUS-PEH', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-bus-bm', name: 'Business Management', code: 'SHS-BUS-BM', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-bus-acc', name: 'Accounting', code: 'SHS-BUS-ACC', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-bus-econ', name: 'Economics', code: 'SHS-BUS-ECON', department: 'Senior High School', category: 'Elective' },

  // SHS (Visual & Performing Arts)
  { id: 'sub-shs-vpa-core-eng', name: 'English Language', code: 'SHS-VPA-ENG', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-vpa-core-mat', name: 'Mathematics', code: 'SHS-VPA-MAT', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-vpa-core-soc', name: 'Social Studies', code: 'SHS-VPA-SOC', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-vpa-core-sci', name: 'General Science', code: 'SHS-VPA-SCI', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-vpa-core-peh', name: 'Physical Education and Health', code: 'SHS-VPA-PEH', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-vpa-adf', name: 'Art and Design Foundation', code: 'SHS-VPA-ADF', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-vpa-ads', name: 'Art and Design Studio', code: 'SHS-VPA-ADS', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-vpa-dct', name: 'Design and Communication Technology', code: 'SHS-VPA-DCT', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-vpa-pa', name: 'Performing Arts', code: 'SHS-VPA-PA', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-vpa-music', name: 'Music', code: 'SHS-VPA-MUSIC', department: 'Senior High School', category: 'Elective' },

  // SHS (Home Economics)
  { id: 'sub-shs-hec-core-eng', name: 'English Language', code: 'SHS-HEC-ENG', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-hec-core-mat', name: 'Mathematics', code: 'SHS-HEC-MAT', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-hec-core-soc', name: 'Social Studies', code: 'SHS-HEC-SOC', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-hec-core-sci', name: 'General Science', code: 'SHS-HEC-SCI', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-hec-core-peh', name: 'Physical Education and Health', code: 'SHS-HEC-PEH', department: 'Senior High School', category: 'Core' },
  { id: 'sub-shs-hec-mil', name: 'Management in Living', code: 'SHS-HEC-MIL', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-hec-fn', name: 'Food and Nutrition', code: 'SHS-HEC-FN', department: 'Senior High School', category: 'Elective' },
  { id: 'sub-shs-hec-ct', name: 'Clothing and Textiles', code: 'SHS-HEC-CT', department: 'Senior High School', category: 'Elective' }
];
