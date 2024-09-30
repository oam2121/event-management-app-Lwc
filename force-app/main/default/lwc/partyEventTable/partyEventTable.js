import { LightningElement, wire, track } from 'lwc';
import getPartyEvents from '@salesforce/apex/PartyEventController.getPartyEvents';
import createTicket from '@salesforce/apex/TicketController.createTicket';
import getSeatingStatus from '@salesforce/apex/PartyEventController.getSeatingStatus';
import savePayment from '@salesforce/apex/PaymentController.savePayment'; // Import save payment Apex method
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import visaLogo from '@salesforce/resourceUrl/visa';      // Path to visa logo
import mastercardLogo from '@salesforce/resourceUrl/mastercard';  // Path to mastercard logo
import amexLogo from '@salesforce/resourceUrl/amex';      // Path to amex logo
import defaultLogo from '@salesforce/resourceUrl/defaultLogo';  // Ensure this logo is uploaded as a static resource
import generateAndSendOTP from '@salesforce/apex/OTPService.generateAndSendOTP';
import verifyOTP from '@salesforce/apex/OTPService.verifyOTP';


export default class ParentComponent extends LightningElement {
    @track events = [];
    @track isModalOpen = false;
    @track isTicketModalOpen = false;
    @track isPaymentModalOpen = false;  // Track payment modal
    @track selectedEventId;
    @track selectedTicketId;  // Track the selected ticket for payment
    @track buyerName = '';
    @track buyerEmail = '';
    @track quantity = 1;
    @track seatingStatus;
    @track statusClass;
    @track ticketType = '';
    @track paymentStatus = '';
    @track paymentType;
    @track cardNumber = '';
    rawCardNumber = '';  // Actual raw card number for backend
    @track expiryDate;
    @track cvv = '';
    @track upiId = '';
    @track totalAmount; // Track total amount for payment
    @track cardLogo = defaultLogo;  // Set default logo initially
    @track otp = '';
    @track isOtpValid = false;
    @track showSubmitButton = false; // This property controls the visibility of the Submit Payment button
    @track isPaymentSuccessful = false;
    @track ticketTypes = [
        { label: 'Regular', value: 'Regular' },
        { label: 'VIP', value: 'VIP' },
        { label: 'Early Bird', value: 'Early Bird' }
    ];

    @track paymentStatuses = [
        { label: 'Paid', value: 'Paid' },
        { label: 'Unpaid', value: 'Unpaid' },
        { label: 'Failed', value: 'Failed' }
    ];

    @track paymentOptions = [
        { label: 'Debit Card', value: 'Debit Card' },
        { label: 'Credit Card', value: 'Credit Card' },
        { label: 'UPI', value: 'UPI' }
    ];

    columns = [
        { label: 'Event Name', fieldName: 'Event_Name__c' },
        { label: 'Event Type', fieldName: 'Event_Type__c' },
        { label: 'Start Date', fieldName: 'Event_Start_Date__c', type: 'date' },
        { label: 'End Date', fieldName: 'Event_End_Date__c', type: 'date' },
        { label: 'Location', fieldName: 'Location__c' },
        { label: 'Price', fieldName: 'Price__c', type: 'currency' },
        { type: 'button', typeAttributes: { label: 'View Details', name: 'view_details', variant: 'brand' } },
        { type: 'button', typeAttributes: { label: 'Book Tickets', name: 'book_tickets', variant: 'brand' } }
    ];


    @wire(getPartyEvents)
    wiredEvents({ error, data }) {
        if (data) {
            // Format the event dates and times before assigning them
            this.events = data.map(event => {
                return {
                    ...event,
                    formattedStartDate: this.getFormattedDate(event.Event_Start_Date__c),
                    formattedStartTime: this.getFormattedTime(event.Event_Start_Date__c),
                    formattedEndDate: this.getFormattedDate(event.Event_End_Date__c),
                    formattedEndTime: this.getFormattedTime(event.Event_End_Date__c)
                };
            });
        } else if (error) {
            this.showToast('Error', 'Error fetching events', 'error');
        }
    }

    @wire(getSeatingStatus, { eventId: '$selectedEventId' })
    wiredSeatingStatus({ error, data }) {
        if (data) {
            this.seatingStatus = data;
            this.statusClass = (data === 'Housefull') ? 'slds-text-color_error' : 'slds-text-color_success';
        } else if (error) {
            this.seatingStatus = 'Error fetching status';
            this.statusClass = 'slds-text-color_error';
            console.error('Error fetching seating status:', error);
        }
    }

    get isBookingDisabled() {
        return this.seatingStatus === 'Housefull';
    }

    get progressPercentage() {
        let filledFields = 0;
        if (this.buyerName) filledFields++;
        if (this.buyerEmail) filledFields++;
        if (this.quantity > 0) filledFields++;
        if (this.ticketType) filledFields++;
        if (this.paymentStatus) filledFields++;

        return (filledFields / 5) * 100;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        this.selectedEventId = row.Id;
        if (actionName === 'view_details') {
            this.isModalOpen = true;
        } else if (actionName === 'book_tickets') {
            this.isTicketModalOpen = true;
            this.fetchSeatingStatus();
        }
    }

    fetchSeatingStatus() {
        if (this.selectedEventId) {
            getSeatingStatus({ eventId: this.selectedEventId })
                .then((data) => {
                    this.seatingStatus = data;
                    this.statusClass = (data === 'Housefull') ? 'slds-text-color_error' : 'slds-text-color_success';
                })
                .catch((error) => {
                    this.seatingStatus = 'Error fetching status';
                    this.statusClass = 'slds-text-color_error';
                    console.error('Error fetching seating status:', error);
                });
        } else {
            this.seatingStatus = 'No event selected';
            this.statusClass = 'slds-text-color_error';
        }
    }

    bookTickets() {
        try {
            // Log the input data for verification before making the API call
            console.log('Booking Ticket with details:');
            console.log('Buyer Name:', this.buyerName);
            console.log('Buyer Email:', this.buyerEmail);
            console.log('Event ID:', this.selectedEventId);
            console.log('Quantity:', this.quantity);
            console.log('Ticket Type:', this.ticketType);
    
            // Call Apex method to create a ticket
            createTicket({
                buyerName: this.buyerName,
                buyerEmail: this.buyerEmail,
                eventId: this.selectedEventId,
                quantity: this.quantity,
                ticketType: this.ticketType,
                paymentStatus: 'Unpaid',  // Default to 'Unpaid'
                purchaseDate: new Date()
            })
            .then((result) => {
                // Log the result to see if ticket ID and other details are returned
                console.log('Ticket Booking Result:', result);
    
                // Check if result contains the necessary fields
                if (result && result.Id) {
                    // Set ticket ID and amount for payment modal
                    this.selectedTicketId = result.Id;
                    this.totalAmount = result.Total_Amount__c;  // Assuming Total_Amount__c is available
    
                    // Close the ticket modal and open the payment modal
                    this.isTicketModalOpen = false;
                    this.isPaymentModalOpen = true;
                    
                    // Show success message
                    this.showToast('Success', 'Ticket booked successfully!', 'success');
                } else {
                    // Handle the case where result does not contain expected fields
                    this.showToast('Error', 'Ticket booked, but no response details found.', 'error');
                }
            })
            .catch((error) => {
                // Log the error object for better debugging
                console.error('Error occurred while booking ticket:', error);
    
                // Handle specific error cases and fallback to a general error message
                const errorMessage = error?.body?.message || 'An unknown error occurred while booking the ticket';
                this.showToast('Error', errorMessage, 'error');
            });
        } catch (err) {
            // Handle any unexpected errors
            console.error('Unexpected error during ticket booking:', err);
            this.showToast('Error', 'An unexpected error occurred. Please try again.', 'error');
        }
    }
    
    handleInputChange(event) {
        const field = event.target.dataset.id;

        if (field === 'cardNumber') {
            let inputVal = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    
            // Store the raw card number for backend processing
            this.rawCardNumber = inputVal;
    
            // Limit the raw card number to 16 digits
            if (this.rawCardNumber.length > 16) {
                this.rawCardNumber = this.rawCardNumber.slice(0, 16);
            }
    
            // Add spaces every 4 digits for UI display
            let formattedVal = this.rawCardNumber.replace(/(.{4})/g, '$1 ').trim();
    
            // Update the cardNumber (with spaces) for UI display
            this.cardNumber = formattedVal;

            // Detect card type and update logo based on the card number prefix
            if (this.rawCardNumber.startsWith('4')) {
                this.cardLogo = visaLogo;
            } else if (this.rawCardNumber.startsWith('5') || this.rawCardNumber.startsWith('2')) {
                this.cardLogo = mastercardLogo;
            } else if (this.rawCardNumber.startsWith('34') || this.rawCardNumber.startsWith('37')) {
                this.cardLogo = amexLogo;
            } else {
                this.cardLogo = defaultLogo;  // Show default logo if no match
            }
        } else {
            this[field] = event.target.value;
        }
    }

    handlePaymentTypeChange(event) {
        this.paymentType = event.target.value;
    
        // Ensure that when the payment type is updated, the relevant sections are shown
        if (this.paymentType === 'Debit Card' || this.paymentType === 'Credit Card') {
            this.isCardPayment = true;
            this.isUpiPayment = false;
        } else if (this.paymentType === 'UPI') {
            this.isCardPayment = false;
            this.isUpiPayment = true;
        } else {
            this.isCardPayment = false;
            this.isUpiPayment = false;
        }
    }
    
    

    get isCardPayment() {
        return this.paymentType === 'Debit Card' || this.paymentType === 'Credit Card';
    }

    get isUpiPayment() {
        return this.paymentType === 'UPI';
    }

   // When submitting the payment, pass the raw card number
   handleSubmitPayment() {
    const paymentDetails = {
        paymentType: this.paymentType,
        cardNumber: this.rawCardNumber,  // Use rawCardNumber (no dashes or spaces)
        expiryDate: this.expiryDate,
        cvv: this.cvv,
        upiId: this.upiId,
        ticketId: this.selectedTicketId  // Ticket ID is passed here
    };

    // Call the Apex method for saving the payment
    savePayment({ paymentDetails })
        .then(() => {
            this.showToast('Success', 'Payment processed successfully!', 'success');
            this.isPaymentModalOpen = false;  // Close payment modal after success
            
        })
        .catch((error) => {
            const errorMessage = error?.body?.message || 'An unknown error occurred during payment';
            this.showToast('Error', errorMessage, 'error');
        });
}
    
    resetFormForAnotherTicket() {
        this.buyerName = '';
        this.buyerEmail = '';
        this.quantity = 1;
        this.ticketType = 'Regular';
        this.paymentStatus = 'Unpaid';
    }

    closeModal() {
        this.isModalOpen = false;
    }

    closeTicketModal() {
        this.isTicketModalOpen = false;
    }

    closePaymentModal() {
        this.isPaymentModalOpen = false;
    }

   // Toast Utility
   showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
        mode: 'dismissable'
    }));
}

connectedCallback() {
    const modal = this.template.querySelector('.custom-payment-container');
    if (modal) {
        modal.style.opacity = 0;
        modal.style.transform = 'scale(0.8)';
    
        // Trigger animation on mount
        setTimeout(() => {
            modal.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            modal.style.opacity = 1;
            modal.style.transform = 'scale(1)';
        }, 100);
    }
}

disconnectedCallback() {
    const modal = this.template.querySelector('.custom-payment-container');
    if (modal) {
        // Add a fade-out effect before the modal closes
        modal.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        modal.style.opacity = 0;
        modal.style.transform = 'scale(0.8)';
    }
}
handleOtpInputChange(event) {
    this.otp = event.target.value;
    // Remove any previous OTP validation status when the OTP changes
    this.isOtpValid = false;
}

handleGenerateOTP() {
    generateAndSendOTP({ email: this.buyerEmail })
        .then(result => {
            this.showToast('Success', result, 'success');
        })
        .catch(error => {
            console.error('Error generating OTP:', error);
            this.showToast('Error', 'Error generating OTP', 'error');
        });
}
// JavaScript Method in LWC for verifying OTP
handleVerifyOTP() {
    if (this.otp.length === 6) {
        verifyOTP({ email: this.buyerEmail, inputOtp: this.otp })
            .then(result => {
                this.isOtpValid = result;
                if (result) {
                    this.showToast('Success', 'OTP verified successfully', 'success');
                    this.showSubmitButton = true; // Show the Submit Payment button
                } else {
                    this.showToast('Error', 'Invalid OTP or OTP expired', 'error');
                    this.showSubmitButton = false; // Keep the Submit Payment button hidden
                }
            })
            .catch(error => {
                console.error('Error verifying OTP:', error);
                this.showToast('Error', 'Error verifying OTP. Please try again.', 'error');
                this.showSubmitButton = false; // Keep the Submit Payment button hidden
            });
    } else {
        this.showToast('Error', 'OTP must be 6 digits', 'error');
        this.showSubmitButton = false; // Keep the Submit Payment button hidden
    }
}


// Getter to determine if the Verify OTP button should be disabled
get isVerifyDisabled() {
    return this.isOtpValid;  // If OTP is valid, disable "Verify OTP" button
}

// Getter to determine if the Submit Payment button should be disabled
get isSubmitDisabled() {
    return !this.isOtpValid;  // If OTP is not valid, disable "Submit Payment" button
}

handleViewDetails(event) {
    const eventId = event.target.getAttribute('data-id');
    this.selectedEventId = eventId;
    this.isModalOpen = true;
}


handleBookTickets(event) {
    const eventId = event.target.getAttribute('data-id');
    this.selectedEventId = eventId;
    this.isTicketModalOpen = true;
    this.fetchSeatingStatus();
}

 // Method to get formatted date
 getFormattedDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(); // Return date only
}

// Method to get formatted time
getFormattedTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Return time only
}


}
