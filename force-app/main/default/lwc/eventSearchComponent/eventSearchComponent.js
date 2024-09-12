import { LightningElement, track } from 'lwc';
import searchCriteria from '@salesforce/apex/EventController.searchEvents';

export default class EventSearchComponent extends LightningElement {
    @track searchCriteria = {
        eventName: ''  // Store the search event name
    };

    // Handle input change for event name
    handleInputChange(event) {
        this.searchCriteria.eventName = event.target.value;
    }

    // Handle the search button click
    handleSearch() {
        // Dispatch the search event to the parent component (calendarComponent)
        const searchEvent = new CustomEvent('searchresults', {
            detail: { eventName: this.searchCriteria.eventName }
        });
        this.dispatchEvent(searchEvent);
    }
}
