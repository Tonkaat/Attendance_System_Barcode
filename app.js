const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const xl = require('excel4node');
const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Helper function to read and write student data
const STUDENTS_FILE = path.join(__dirname, 'data', 'students.json');

// Ensure the data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize students.json if it doesn't exist
if (!fs.existsSync(STUDENTS_FILE)) {
  // Sample student data
  const sampleStudents = [
    { 
      id: '1001', 
      givenName: 'John', 
      surname: 'Doe', 
      barcode: '1001',
      checkedInTime: null,
      checkedOutTime: null
    },
    { 
      id: '1002', 
      givenName: 'Jane', 
      surname: 'Smith', 
      barcode: '1002',
      checkedInTime: null,
      checkedOutTime: null
    },
    // Add more sample students as needed
  ];
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(sampleStudents, null, 2));
}

const getStudents = () => {
  try {
    const data = fs.readFileSync(STUDENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading students file:', err);
    return [];
  }
};

const saveStudents = (students) => {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing students file:', err);
    return false;
  }
};

// Routes
app.get('/', (req, res) => {
  const students = getStudents();
  res.render('index', { students });
});

app.get('/student-list', (req, res) => {
  const students = getStudents();
  res.render('student-list', { students });
});

app.get('/barcode-generator', (req, res) => {
  const students = getStudents();
  res.render('barcode-generator', { students });
});

// API Endpoints
app.get('/api/students', (req, res) => {
  const students = getStudents();
  res.json(students);
});

app.get('/api/student/:barcode', (req, res) => {
  const barcode = req.params.barcode;
  const students = getStudents();
  const student = students.find(s => s.barcode === barcode);
  
  if (student) {
    res.json({ success: true, student });
  } else {
    res.status(404).json({ success: false, message: 'Student not found' });
  }
});

app.post('/api/checkin', (req, res) => {
  const { id } = req.body;
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === id);
  
  if (studentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  
  const student = students[studentIndex];
  
  if (student.checkedInTime && student.checkedOutTime) {
    return res.json({ 
      success: false, 
      message: 'Student has already completed attendance for today',
      student
    });
  }
  
  if (!student.checkedInTime) {
    student.checkedInTime = moment().format('YYYY-MM-DD HH:mm:ss');
    students[studentIndex] = student;
    saveStudents(students);
    return res.json({ success: true, message: 'Check-in successful', student });
  } else {
    return res.json({ 
      success: false, 
      message: 'Student is already checked in',
      student
    });
  }
});

app.post('/api/checkout', (req, res) => {
  const { id } = req.body;
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === id);
  
  if (studentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  
  const student = students[studentIndex];
  
  if (!student.checkedInTime) {
    return res.json({ 
      success: false, 
      message: 'Student must check in first',
      student
    });
  }
  
  if (student.checkedOutTime) {
    return res.json({ 
      success: false, 
      message: 'Student has already checked out',
      student
    });
  }
  
  student.checkedOutTime = moment().format('YYYY-MM-DD HH:mm:ss');
  students[studentIndex] = student;
  saveStudents(students);
  return res.json({ success: true, message: 'Check-out successful', student });
});

app.post('/api/reset-status', (req, res) => {
  const { id } = req.body;
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === id);
  
  if (studentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  
  students[studentIndex].checkedInTime = null;
  students[studentIndex].checkedOutTime = null;
  saveStudents(students);
  
  return res.json({ 
    success: true, 
    message: 'Student status reset successfully',
    student: students[studentIndex]
  });
});

/**
 * Reset all students' statuses endpoint
 */
app.post('/api/reset-all-status', (req, res) => {
  try {
    const students = getStudents();
    
    // Reset check-in and check-out times for all students
    students.forEach(student => {
      student.checkedInTime = null;
      student.checkedOutTime = null;
    });
    
    // Save the updated student data
    if (saveStudents(students)) {
      return res.json({
        success: true,
        message: 'All student statuses reset successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to reset student statuses'
      });
    }
  } catch (error) {
    console.error('Error resetting all student statuses:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate and download Excel file
app.get('/api/download-excel', (req, res) => {
  const students = getStudents();
  
  // Create a new workbook
  const wb = new xl.Workbook();
  const ws = wb.addWorksheet('Attendance');
  
  // Define styles
  const headerStyle = wb.createStyle({
    font: {
      bold: true,
      color: '#FFFFFF',
      size: 12,
    },
    fill: {
      type: 'pattern',
      patternType: 'solid',
      fgColor: '#0D47A1', // Dark blue color
    },
  });
  
  // Add headers
  const headers = ['ID', 'Given Name', 'Surname', 'Checked In Time', 'Checked Out Time', 'Barcode'];
  headers.forEach((header, i) => {
    ws.cell(1, i + 1)
      .string(header)
      .style(headerStyle);
  });
  
  // Add student data
  students.forEach((student, i) => {
    ws.cell(i + 2, 1).string(student.id);
    ws.cell(i + 2, 2).string(student.givenName);
    ws.cell(i + 2, 3).string(student.surname);
    ws.cell(i + 2, 4).string(student.checkedInTime || 'Not checked in');
    ws.cell(i + 2, 5).string(student.checkedOutTime || 'Not checked out');
    ws.cell(i + 2, 6).string(student.barcode);
  });
  
  // Set column widths
  for (let i = 1; i <= 6; i++) {
    ws.column(i).setWidth(20);
  }
  
  // Create a temporary file
  const tempFilePath = path.join(__dirname, 'attendance_data.xlsx');
  
  wb.write(tempFilePath, (err, stats) => {
    if (err) {
      console.error('Error creating Excel file:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate Excel file' });
    }
    
    res.download(tempFilePath, 'attendance_data.xlsx', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      
      // Delete the temporary file after download
      fs.unlinkSync(tempFilePath);
    });
  });
});

// Generate barcodes and create PDF
app.get('/api/generate-barcode-pdf', (req, res) => {
  const studentIds = req.query.ids ? req.query.ids.split(',') : [];
  const students = getStudents();
  
  let studentsToInclude = students;
  if (studentIds.length > 0) {
    studentsToInclude = students.filter(student => studentIds.includes(student.id));
  }
  
  if (studentsToInclude.length === 0) {
    return res.status(400).json({ success: false, message: 'No students selected' });
  }
  
  // Create a PDF document
  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
  });
  
  // Pipe the PDF to the response
  const pdfFile = path.join(__dirname, 'student_barcodes.pdf');
  const writeStream = fs.createWriteStream(pdfFile);
  doc.pipe(writeStream);
  
  // Set up document properties
  doc.font('Helvetica-Bold').fontSize(20).text('Student Attendance Barcodes', {
    align: 'center'
  });
  
  doc.moveDown();
  
  // Add each student and their barcode
  let i = 0;
  const perRow = 2;
  const itemWidth = 250;
  const itemHeight = 120;
  
  for (const student of studentsToInclude) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    
    const x = col * itemWidth + 40;
    const y = row * itemHeight + 100;
    
    // Create barcode as canvas
    const canvas = createCanvas(200, 80);
    JsBarcode(canvas, student.barcode, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 14,
    });
    
    // Add to PDF
    const imgData = canvas.toDataURL('image/png');
    const imgBuffer = Buffer.from(imgData.split(',')[1], 'base64');
    
    doc.fontSize(12).text(`${student.givenName} ${student.surname} (ID: ${student.id})`, x, y);
    doc.image(imgBuffer, x, y + 20, { width: 180 });
    
    i++;
    
    // Create a new page if we've filled the current one
    if (i > 0 && i % 10 === 0 && i < studentsToInclude.length) {
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(20).text('Student Attendance Barcodes', {
        align: 'center'
      });
      doc.moveDown();
    }
  }
  
  // Finalize the PDF
  doc.end();
  
  writeStream.on('finish', () => {
    res.download(pdfFile, 'student_barcodes.pdf', (err) => {
      if (err) {
        console.error('Error downloading barcode PDF:', err);
      }
      
      // Delete the temporary file after download
      fs.unlinkSync(pdfFile);
    });
  });
  
  writeStream.on('error', (err) => {
    console.error('Error generating barcode PDF:', err);
    res.status(500).json({ success: false, message: 'Failed to generate barcode PDF' });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`View application at http://localhost:${PORT}`);
});