// College color mapping for calendar and other UI elements
export const COLLEGE_COLORS: Record<string, string> = {
  'Silver Oak College of Engineering & Technology': 'hsl(221, 83%, 53%)', // Blue
  'Aditya Silver Oak Institute of Technology': 'hsl(142, 76%, 36%)', // Green
  'Silver Oak College of Computer Applications': 'hsl(263, 70%, 50%)', // Purple
  'Silver Oak College of Nursing': 'hsl(330, 81%, 60%)', // Pink
  'Silver Oak College of Physiotherapy': 'hsl(24, 95%, 53%)', // Orange
  'Silver Oak Medical College': 'hsl(0, 84%, 60%)', // Red
  'Silver Oak Dental College': 'hsl(47, 95%, 53%)', // Yellow
  'Silver Oak College of Pharmacy': 'hsl(173, 80%, 40%)', // Teal
  'Silver Oak Law College': 'hsl(200, 98%, 39%)', // Cyan
  'Silver Oak College of Commerce': 'hsl(280, 68%, 50%)', // Violet
  'Silver Oak College of Arts': 'hsl(339, 82%, 51%)', // Rose
  'Silver Oak College of Science': 'hsl(199, 89%, 48%)', // Sky
  'Silver Oak College of Education': 'hsl(142, 71%, 45%)', // Emerald
  'Silver Oak College of Management': 'hsl(231, 48%, 48%)', // Indigo
  'Silver Oak College of Architecture': 'hsl(25, 95%, 53%)', // Amber
  'Silver Oak College of Design': 'hsl(292, 84%, 61%)', // Fuchsia
  'Silver Oak College of Hotel Management': 'hsl(12, 76%, 61%)', // Coral
};

export const getCollegeColor = (collegeName: string | null | undefined): string => {
  if (!collegeName) return 'hsl(var(--primary))';
  return COLLEGE_COLORS[collegeName] || 'hsl(var(--primary))';
};

// Get a lighter shade for backgrounds
export const getCollegeBgColor = (collegeName: string | null | undefined): string => {
  const color = getCollegeColor(collegeName);
  // Add transparency for background usage
  return color.replace(')', ' / 0.15)').replace('hsl(', 'hsla(');
};
