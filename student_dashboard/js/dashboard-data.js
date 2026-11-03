// القيم الافتراضية للطالب الجديد (قبل أول حفظ). يجب أن تطابق DEFAULT في database/student_dashboard.sql
export const INITIAL_DATA = {
    userProfile: {
        studentName: 'طالب هندسة زراعية',
        academicYear: '3',
        academicTerm: '2',
        gpa: '',
        quote: 'استعن بالله ولا تعجز.. كل خطوة هندسية تقربك من هدفك.',
        quickNotes: ''
    },
    progress: {}, // { [subjectId]: { totalFiles, reviewedFiles, link } }
    goals: []
};
