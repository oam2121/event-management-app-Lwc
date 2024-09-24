import { LightningElement, api, wire, track } from 'lwc';
import getSeatingStatus from '@salesforce/apex/PartyEventController.getSeatingStatus';

export default class SeatingStatus extends LightningElement {
    @api eventId;  // Reactively watch changes to eventId
    @track seatingStatus;  // Local property to store the seating status fetched from Apex

    // Wire a method to fetch seating information based on the eventId
    @wire(getSeatingStatus, { eventId: '$eventId' })
    wiredSeatingStatus({ error, data }) {
        if (data) {
            this.seatingStatus = data;
        } else if (error) {
            console.error('Error fetching seating status:', error);
            this.seatingStatus = 'Error fetching status';
        }
    }

    // Computed property to determine CSS class based on seating status
    get statusClass() {
        return this.seatingStatus === 'Housefull' ? 'red' : 'green';
    }
}
