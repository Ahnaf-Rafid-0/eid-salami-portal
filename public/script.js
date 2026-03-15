// Load payment methods on page load
document.addEventListener('DOMContentLoaded', function() {
  loadPaymentMethods();
  setupPaymentButtons();
  setupMessageForm();
  setupCharacterCounter();
});

// Load payment methods on page load
async function loadPaymentMethods() {
  try {
    const response = await fetch('/api/payment-methods');
    const data = await response.json();

    document.getElementById('bkash-number').textContent = data.bkash;
    document.getElementById('nagad-number').textContent = data.nagad;
    document.getElementById('bank-number').textContent = data.bank;
    document.getElementById('bank-holder').textContent = data.bank_holder;
    document.getElementById('bank-address').textContent = data.bank_address;
    document.getElementById('cellfin-number').textContent = data.cellfin;
    document.getElementById('rocket-number').textContent = data.rocket;
    document.getElementById('mkash-number').textContent = data.mkash;
  } catch (error) {
    console.error('Error loading payment methods:', error);
  }
}

// Setup payment button toggles
function setupPaymentButtons() {
  const buttons = document.querySelectorAll('.payment-btn');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      const method = this.dataset.method;
      const detailsId = `${method}-details`;
      const details = document.getElementById(detailsId);

      // Close other open details
      document.querySelectorAll('.payment-details').forEach(detail => {
        if (detail.id !== detailsId) {
          detail.style.display = 'none';
        }
      });

      // Toggle current details
      if (details.style.display === 'none') {
        details.style.display = 'block';
      } else {
        details.style.display = 'none';
      }
    });
  });
}

// Copy to clipboard function
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;

  navigator.clipboard.writeText(text).then(() => {
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Copied!';
    button.style.background = '#27ae60';

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy. Please try again.');
  });
}

// Setup message form
function setupMessageForm() {
  const form = document.getElementById('messageForm');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const message = document.getElementById('message').value.trim();

    // Clear previous errors
    clearErrors();

    // Validate
    if (!validateForm(name, message)) {
      return;
    }

    try {
      const response = await fetch('/api/submit-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, message })
      });

      const data = await response.json();

      if (data.success) {
        showSuccessMessage();
        form.reset();
        document.getElementById('char-count').textContent = '0';
      } else {
        showError('message', data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('message', 'Failed to send message. Please try again.');
    }
  });
}

// Validate form
function validateForm(name, message) {
  let isValid = true;

  if (name.length < 2) {
    showError('name', 'Name must be at least 2 characters');
    isValid = false;
  }

  if (message.length < 5) {
    showError('message', 'Message must be at least 5 characters');
    isValid = false;
  }

  return isValid;
}

// Show error
function showError(fieldId, errorMsg) {
  const errorElement = document.getElementById(`${fieldId}-error`);
  errorElement.textContent = errorMsg;
  errorElement.classList.add('show');
}

// Clear errors
function clearErrors() {
  document.querySelectorAll('.error').forEach(err => {
    err.textContent = '';
    err.classList.remove('show');
  });
}

// Show success message
function showSuccessMessage() {
  const successMsg = document.getElementById('successMessage');
  successMsg.style.display = 'block';

  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 5000);
}

// Setup character counter
function setupCharacterCounter() {
  const textarea = document.getElementById('message');
  textarea.addEventListener('input', function() {
    document.getElementById('char-count').textContent = this.value.length;
  });
}