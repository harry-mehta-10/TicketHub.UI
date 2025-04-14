// Wait for the entire DOM to load before executing logic
document.addEventListener('DOMContentLoaded', function() {
    // Grabbing DOM elements for later use
    const ticketForm = document.getElementById('ticketForm');
    const alertMessages = document.getElementById('alertMessages');
    const quantitySelect = document.getElementById('quantity');
    const ticketQuantitySummary = document.getElementById('ticketQuantitySummary');
    const totalAmount = document.getElementById('totalAmount');

    // API endpoint for ticket purchases
    const apiUrl = 'https://nscc-0484912-webapp-faepc0frd6addnf8.canadacentral-01.azurewebsites.net/api/tickets';

    initializeFormListeners();

    ticketForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Stop here if form validation fails
        if (!validateForm()) {
            return;
        }

        const formData = getFormData();

        // Submit the form data to the server
        submitPurchase(formData);
    });

    // Add formatting and validation listeners to form inputs
    function initializeFormListeners() {
        // Recalculate order total when ticket quantity changes
        quantitySelect.addEventListener('change', updateOrderSummary);

        // Auto-format credit card number as user types (e.g., 1234 5678 9012 3456)
        const creditCardInput = document.getElementById('creditCard');
        creditCardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });

        // Auto-format expiration date to MM/YY
        const expirationInput = document.getElementById('expiration');
        expirationInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // Only allow numeric input in the security code field
        const securityCodeInput = document.getElementById('securityCode');
        securityCodeInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        });

        // Postal code formatting based on selected country
        const postalCodeInput = document.getElementById('postalCode');
        const countrySelect = document.getElementById('country');

        countrySelect.addEventListener('change', function() {
            postalCodeInput.value = '';
            updatePostalCodePlaceholder();
        });

        postalCodeInput.addEventListener('input', function(e) {
            const country = countrySelect.value;
            let value = e.target.value.toUpperCase();

            if (country === 'Canada') {
                // Format as A1A 1A1
                value = value.replace(/[^A-Z0-9]/g, '');
                if (value.length > 3) {
                    value = value.substring(0, 3) + ' ' + value.substring(3, 6);
                }
            } else if (country === 'United States') {
                // Only digits for US ZIP code
                value = value.replace(/\D/g, '');
            }

            e.target.value = value;
        });

        // Set placeholder and order summary when page loads
        updateOrderSummary();
        updatePostalCodePlaceholder();
    }

    // Update placeholder in postal code input depending on selected country
    function updatePostalCodePlaceholder() {
        const postalCodeInput = document.getElementById('postalCode');
        const country = document.getElementById('country').value;

        if (country === 'Canada') {
            postalCodeInput.placeholder = 'A1A 1A1';
        } else if (country === 'United States') {
            postalCodeInput.placeholder = '12345';
        } else {
            postalCodeInput.placeholder = 'Postal Code';
        }
    }

    // Calculate and display the total ticket cost
    function updateOrderSummary() {
        const quantity = parseInt(quantitySelect.value) || 0;
        const pricePerTicket = 150.00;
        const total = quantity * pricePerTicket;

        ticketQuantitySummary.textContent = quantity;
        totalAmount.textContent = total.toFixed(2);
    }

    // Validates all form fields before submission
    function validateForm() {
        ticketForm.classList.remove('was-validated');

        if (!ticketForm.checkValidity()) {
            ticketForm.classList.add('was-validated');
            showAlert('Please fill out all required fields correctly.', 'danger');
            return false;
        }

        const creditCard = document.getElementById('creditCard').value.replace(/\s/g, '');
        if (!isValidCreditCard(creditCard)) {
            document.getElementById('creditCard').classList.add('is-invalid');
            showAlert('Please enter a valid credit card number.', 'danger');
            return false;
        }

        const expiration = document.getElementById('expiration').value;
        if (!isValidExpirationDate(expiration)) {
            document.getElementById('expiration').classList.add('is-invalid');
            showAlert('Please enter a valid expiration date that is not expired.', 'danger');
            return false;
        }

        const securityCode = document.getElementById('securityCode').value;
        if (!/^\d{3,4}$/.test(securityCode)) {
            document.getElementById('securityCode').classList.add('is-invalid');
            showAlert('Security code must be 3 or 4 digits.', 'danger');
            return false;
        }

        const postalCode = document.getElementById('postalCode').value;
        const country = document.getElementById('country').value;

        if (country === 'Canada' && !isValidCanadianPostalCode(postalCode)) {
            document.getElementById('postalCode').classList.add('is-invalid');
            showAlert('Please enter a valid Canadian postal code (e.g., A1A 1A1).', 'danger');
            return false;
        } else if (country === 'United States' && !isValidUSZipCode(postalCode)) {
            document.getElementById('postalCode').classList.add('is-invalid');
            showAlert('Please enter a valid US ZIP code (5 digits).', 'danger');
            return false;
        }

        return true;
    }

    // Luhn algorithm for credit card validation
    function isValidCreditCard(number) {
        if (!/^\d{13,19}$/.test(number)) return false;

        let sum = 0;
        let double = false;

        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number.charAt(i));
            if (double) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            double = !double;
        }

        return sum % 10 === 0;
    }

    // Check that the expiration date is in MM/YY format and not expired
    function isValidExpirationDate(expiration) {
        if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiration)) return false;

        const [month, yearStr] = expiration.split('/');
        const year = 2000 + parseInt(yearStr);

        const expirationDate = new Date(year, month, 0); // Last day of that month
        const today = new Date();
        today.setDate(1);
        today.setHours(0, 0, 0, 0);

        return expirationDate >= today;
    }

    // Validate Canadian postal code format
    function isValidCanadianPostalCode(postalCode) {
        return /^[A-Za-z][0-9][A-Za-z][ ]?[0-9][A-Za-z][0-9]$/.test(postalCode);
    }

    // Validate US ZIP code (5-digit format)
    function isValidUSZipCode(zipCode) {
        return /^\d{5}$/.test(zipCode);
    }

    // Collect and sanitize all form inputs for submission
    function getFormData() {
        return {
            concertId: parseInt(document.getElementById('concertId').value),
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            quantity: parseInt(document.getElementById('quantity').value),
            creditCard: document.getElementById('creditCard').value.replace(/\s/g, ''),
            expiration: document.getElementById('expiration').value.trim(),
            securityCode: document.getElementById('securityCode').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            province: document.getElementById('province').value.trim(),
            postalCode: document.getElementById('postalCode').value.trim(),
            country: document.getElementById('country').value
        };
    }

    // Sends the ticket data to the server and handles UI response
    function submitPurchase(formData) {
        const submitButton = ticketForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => {
            return response.json().then(data => {
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to process ticket purchase');
                }
                return data;
            });
        })
        .then(data => {
            showAlert('Your ticket purchase was successful! ' + data.message, 'success');
            ticketForm.reset();
            updateOrderSummary();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(error.message || 'An error occurred while processing your request. Please try again.', 'danger');
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    }

    // Display an alert message at the top of the form
    function showAlert(message, type) {
        alertMessages.textContent = message;
        alertMessages.className = `alert alert-${type}`;
        alertMessages.classList.remove('d-none');
        alertMessages.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
