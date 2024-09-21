import { LightningElement, api, track } from 'lwc';
import createTicket from '@salesforce/apex/TicketController.createTicket';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TicketForm extends LightningElement {
    @api eventId;  // Event ID passed from PartyEventCalendar
    @track ticket = {
        buyerName: '',
        buyerEmail: '',
        quantity: 1,
        ticketType: '',  // Selected ticket type
        paymentStatus: '',  // Selected payment status
        eventId: ''  // Ticket is linked to an event
    };

    // Initialize the ticket with the event ID when the component is loaded
    connectedCallback() {
        this.ticket.eventId = this.eventId;
    }

    // Ticket type options for the combobox
    get ticketTypeOptions() {
        return [
            { label: 'VIP', value: 'VIP' },
            { label: 'Regular', value: 'Regular' },
            { label: 'Early Bird', value: 'Early Bird' }
        ];
    }

    // Payment status options for the combobox
    get paymentStatusOptions() {
        return [
            { label: 'Paid', value: 'Paid' },
            { label: 'Pending', value: 'Pending' },
            { label: 'Failed', value: 'Failed' }
        ];
    }

    // Handle input changes for all form fields (comboboxes and text inputs)
    handleInputChange(event) {
        const field = event.target.name;
        this.ticket[field] = event.target.value;
    }

    // Handle form submission for creating a ticket
    handleSubmitTicket() {
        const buyerName = this.template.querySelector('[data-id="buyerName"]').value;
        const buyerEmail = this.template.querySelector('[data-id="buyerEmail"]').value;
        const quantity = this.template.querySelector('[data-id="quantity"]').value;
        const ticketType = this.template.querySelector('[data-id="ticketType"]').value;
        const paymentStatus = this.template.querySelector('[data-id="paymentStatus"]').value;

        // Check for empty or missing required fields
        if (!buyerName || !buyerEmail || !quantity || !ticketType || !paymentStatus) {
            this.showError('Please fill out all fields.');
            return;
        }

        // Prepare ticket data
        const ticketData = {
            buyerName: buyerName,
            buyerEmail: buyerEmail,
            quantity: quantity,
            ticketType: ticketType,
            paymentStatus: paymentStatus,
            eventId: this.ticket.eventId
        };

        createTicket({ ticketData })
            .then(() => {
                this.showSuccess('Ticket created successfully!');
                this.clearForm();  // Clear the form after successful creation
            })
            .catch(error => {
                console.error('Error creating ticket:', error); // Log the full error
                // Improved error handling to display the right message
                const errorMessage = error.body ? error.body.message : error.message || 'Unknown error occurred';
                this.showError(`Error creating ticket: ${errorMessage}`);
            });
    }

    // Helper function to show toast messages
    showToast(title, message, variant) {
        const toastEvent = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(toastEvent);
    }

    // Show success message
    showSuccess(message) {
        this.showToast('Success', message, 'success');
    }

    // Show error message
    showError(message) {
        this.showToast('Error', message, 'error');
    }

    // Helper function to clear the form after successful submission
    clearForm() {
        this.template.querySelector('[data-id="buyerName"]').value = '';
        this.template.querySelector('[data-id="buyerEmail"]').value = '';
        this.template.querySelector('[data-id="quantity"]').value = '';
        this.template.querySelector('[data-id="ticketType"]').value = '';
        this.template.querySelector('[data-id="paymentStatus"]').value = '';
    }
}
