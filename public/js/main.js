// public/js/main.js

document.addEventListener('DOMContentLoaded', function() {
    // Get the current page path
    const currentPath = window.location.pathname;
    
    // Common functionality for all pages
    initializeCommonFunctions();
    
    // Page-specific functionality
    if (currentPath === '/') {
      initializeHomePage();
    } else if (currentPath === '/student-list') {
      initializeStudentListPage();
    } else if (currentPath === '/barcode-generator') {
      initializeBarcodeGeneratorPage();
    }
  });
  
  // Common functionality used across all pages
  function initializeCommonFunctions() {
    // Add any common functionality here
    console.log('Common functions initialized');
  }
  
  // Home page functionality (index.ejs)
  function initializeHomePage() {
    console.log('Home page initialized');
    
    // Modal elements
    const scanModal = document.getElementById('scan-modal');
    const studentModal = document.getElementById('student-modal');
    const scanButton = document.getElementById('scan-button');
    const closeButton = document.querySelector('.close');
    const closeStudentButton = document.querySelector('.close-student');
    const barcodeInput = document.getElementById('barcode-input');
    const submitBarcode = document.getElementById('submit-barcode');
    const scanResult = document.getElementById('scan-result');
    const studentDetails = document.getElementById('student-details');
    const checkInBtn = document.getElementById('check-in-btn');
    const checkOutBtn = document.getElementById('check-out-btn');
    const recentActivity = document.getElementById('recent-activity');
    
    let currentStudent = null;
    
    // Open the scan modal when the scan button is clicked
    scanButton.addEventListener('click', function() {
      scanModal.style.display = 'block';
      barcodeInput.focus();
      barcodeInput.value = '';
      scanResult.innerHTML = '';
    });
    
    // Close the scan modal when the close button is clicked
    closeButton.addEventListener('click', function() {
      scanModal.style.display = 'none';
    });
    
    // Close the student modal when the close button is clicked
    closeStudentButton.addEventListener('click', function() {
      studentModal.style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target === scanModal) {
        scanModal.style.display = 'none';
      }
      if (event.target === studentModal) {
        studentModal.style.display = 'none';
      }
    });
    
    // Submit barcode to find student
    submitBarcode.addEventListener('click', function() {
      submitBarcodeSearch();
    });
    
    // Allow Enter key to submit barcode
    barcodeInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        submitBarcodeSearch();
      }
    });
    
    // Function to search for a student by barcode
    function submitBarcodeSearch() {
      const barcode = barcodeInput.value.trim();
      
      if (!barcode) {
        scanResult.innerHTML = '<p class="error">Please enter a barcode</p>';
        return;
      }
      
      scanResult.innerHTML = '<p>Searching...</p>';
      
      // Fetch student information
      fetch(`/api/student/${barcode}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            scanResult.innerHTML = '<p class="success">Student found!</p>';
            
            // Store the student data
            currentStudent = data.student;
            
            // Close scan modal and open student modal
            scanModal.style.display = 'none';
            
            // Display student details
            displayStudentDetails(currentStudent);
            
            // Show appropriate buttons
            updateActionButtons(currentStudent);
            
            // Show student modal
            studentModal.style.display = 'block';
          } else {
            scanResult.innerHTML = `<p class="error">${data.message}</p>`;
          }
        })
        .catch(error => {
          console.error('Error:', error);
          scanResult.innerHTML = '<p class="error">An error occurred while searching for the student</p>';
        });
    }
    
    // Display student details in the modal
    function displayStudentDetails(student) {
      studentDetails.innerHTML = `
        <p><span class="label">ID:</span> ${student.id}</p>
        <p><span class="label">Name:</span> ${student.givenName} ${student.surname}</p>
        <p><span class="label">Check-in Status:</span> ${student.checkedInTime ? 'Checked in at ' + student.checkedInTime : 'Not checked in'}</p>
        <p><span class="label">Check-out Status:</span> ${student.checkedOutTime ? 'Checked out at ' + student.checkedOutTime : 'Not checked out'}</p>
      `;
    }
    
    // Update action buttons based on student status
    function updateActionButtons(student) {
      // Hide both buttons first
      checkInBtn.style.display = 'none';
      checkOutBtn.style.display = 'none';
      
      if (student.checkedInTime && student.checkedOutTime) {
        // Student has completed attendance for today
        studentDetails.innerHTML += `
          <p class="status-message complete">
            <i class="fas fa-check-circle"></i> This student has completed attendance for today.
          </p>
        `;
      } else if (student.checkedInTime) {
        // Student is checked in but not checked out
        checkOutBtn.style.display = 'block';
      } else {
        // Student is not checked in
        checkInBtn.style.display = 'block';
      }
    }
    
    // Handle check-in button click
    checkInBtn.addEventListener('click', function() {
      if (!currentStudent) return;
      
      fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentStudent.id }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Update current student data
            currentStudent = data.student;
            
            // Update display
            displayStudentDetails(currentStudent);
            updateActionButtons(currentStudent);
            
            // Update recent activity
            updateRecentActivity(`${currentStudent.givenName} ${currentStudent.surname} checked in at ${currentStudent.checkedInTime}`);
            
            // Show success message
            showTemporaryMessage(studentDetails, 'success', data.message);
          } else {
            // Show error message
            showTemporaryMessage(studentDetails, 'error', data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showTemporaryMessage(studentDetails, 'error', 'An error occurred while checking in');
        });
    });
    
    // Handle check-out button click
    checkOutBtn.addEventListener('click', function() {
      if (!currentStudent) return;
      
      fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentStudent.id }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Update current student data
            currentStudent = data.student;
            
            // Update display
            displayStudentDetails(currentStudent);
            updateActionButtons(currentStudent);
            
            // Update recent activity
            updateRecentActivity(`${currentStudent.givenName} ${currentStudent.surname} checked out at ${currentStudent.checkedOutTime}`);
            
            // Show success message
            showTemporaryMessage(studentDetails, 'success', data.message);
          } else {
            // Show error message
            showTemporaryMessage(studentDetails, 'error', data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showTemporaryMessage(studentDetails, 'error', 'An error occurred while checking out');
        });
    });
    
    // Update recent activity
    function updateRecentActivity(message) {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      
      const timestamp = new Date().toLocaleTimeString();
      activityItem.innerHTML = `
        <p><span class="timestamp">${timestamp}</span>: ${message}</p>
      `;
      
      recentActivity.innerHTML = '';
      recentActivity.appendChild(activityItem);
    }
    
    // Show temporary message in a container
    function showTemporaryMessage(container, type, message) {
      const messageElement = document.createElement('p');
      messageElement.className = `message ${type}`;
      messageElement.innerHTML = message;
      
      // Add the message to the container
      container.appendChild(messageElement);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        container.removeChild(messageElement);
      }, 3000);
    }
  }
  
  // Student List page functionality (student-list.ejs)
  function initializeStudentListPage() {
    console.log('Student List page initialized');
    
    const downloadExcelBtn = document.getElementById('download-excel');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resetButtons = document.querySelectorAll('.reset-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const closeConfirmButton = document.querySelector('.close-confirm');
    const confirmResetBtn = document.getElementById('confirm-reset');
    const cancelResetBtn = document.getElementById('cancel-reset');
    
    let studentIdToReset = null;
    
    // Download Excel file
    downloadExcelBtn.addEventListener('click', function() {
      window.location.href = '/api/download-excel';
    });
    
    // Search functionality
    searchBtn.addEventListener('click', function() {
      filterTable();
    });
    
    searchInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        filterTable();
      }
    });
    
    // Filter table based on search input
    function filterTable() {
      const searchText = searchInput.value.toLowerCase();
      const rows = document.querySelectorAll('#student-table tbody tr');
      
      rows.forEach(row => {
        const id = row.querySelector('td:first-child').textContent.toLowerCase();
        const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        
        if (id.includes(searchText) || name.includes(searchText)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
    
    // Reset button click event
    resetButtons.forEach(button => {
      button.addEventListener('click', function() {
        studentIdToReset = this.getAttribute('data-id');
        confirmModal.style.display = 'block';
      });
    });
    
    // Close confirm modal when the close button is clicked
    closeConfirmButton.addEventListener('click', function() {
      confirmModal.style.display = 'none';
    });
    
    // Close confirm modal when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
      }
    });
    
    // Cancel reset
    cancelResetBtn.addEventListener('click', function() {
      confirmModal.style.display = 'none';
      studentIdToReset = null;
    });
    
    // Confirm reset
    confirmResetBtn.addEventListener('click', function() {
      if (!studentIdToReset) return;
      
      fetch('/api/reset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: studentIdToReset }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Update the table
            const row = document.querySelector(`tr[data-id="${studentIdToReset}"]`);
            if (row) {
              row.querySelector('.check-in-time').textContent = 'Not checked in';
              row.querySelector('.check-out-time').textContent = 'Not checked out';
              row.querySelector('.status').innerHTML = '<span class="status-absent">Absent</span>';
            }
            
            // Close the confirm modal
            confirmModal.style.display = 'none';
            studentIdToReset = null;
            
            // Show success message
            alert('Student status reset successfully');
          } else {
            alert('Failed to reset student status: ' + data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while resetting student status');
        });
    });
  }
  
  // Barcode Generator page functionality (barcode-generator.ejs)
  function initializeBarcodeGeneratorPage() {
    console.log('Barcode Generator page initialized');
    
    const generateAllBarcodesBtn = document.getElementById('generate-all-barcodes');
    const generateSelectedBarcodesBtn = document.getElementById('generate-selected-barcodes');
    const selectAllBtn = document.getElementById('select-all');
    const deselectAllBtn = document.getElementById('deselect-all');
    const searchStudentInput = document.getElementById('search-student');
    const searchBarcodeBtn = document.getElementById('search-barcode-btn');
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    
    // Generate all barcodes
    generateAllBarcodesBtn.addEventListener('click', function() {
      window.location.href = '/api/generate-barcode-pdf';
    });
    
    // Generate selected barcodes
    generateSelectedBarcodesBtn.addEventListener('click', function() {
      const selectedIds = Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(checkbox => checkbox.value);
      
      if (selectedIds.length === 0) {
        alert('Please select at least one student');
        return;
      }
      
      window.location.href = `/api/generate-barcode-pdf?ids=${selectedIds.join(',')}`;
    });
    
    // Select all checkboxes
    selectAllBtn.addEventListener('click', function() {
      studentCheckboxes.forEach(checkbox => {
        const studentItem = checkbox.closest('.student-item');
        if (studentItem.style.display !== 'none') {
          checkbox.checked = true;
        }
      });
    });
    
    // Deselect all checkboxes
    deselectAllBtn.addEventListener('click', function() {
      studentCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    });
    
    // Search functionality
    searchBarcodeBtn.addEventListener('click', function() {
      filterStudents();
    });
    
    searchStudentInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        filterStudents();
      }
    });
    
    // Filter students based on search input
    function filterStudents() {
      const searchText = searchStudentInput.value.toLowerCase();
      const studentItems = document.querySelectorAll('.student-item');
      
      studentItems.forEach(item => {
        const label = item.querySelector('label').textContent.toLowerCase();
        
        if (label.includes(searchText)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }
  }