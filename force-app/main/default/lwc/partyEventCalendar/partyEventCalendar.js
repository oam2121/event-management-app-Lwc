import { LightningElement, track } from 'lwc';
import getEvents from '@salesforce/apex/PartyEventController.getEvents';
import updateEventDate from '@salesforce/apex/PartyEventController.updateEventDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningAlert from 'lightning/alert';
import createEvent from '@salesforce/apex/PartyEventController.createEvent';
import searchEvents from '@salesforce/apex/EventController.searchEvents'; // Fetch the filtered events by search
import createTicket from '@salesforce/apex/TicketController.createTicket'; 

export default class CalendarComponent extends LightningElement {
    // Section: Track variables for modal, events, calendar, and filtering
    @track isCreateModalOpen = false; // Controls the visibility of the create event modal
    @track isModalOpen = false; // Controls the visibility of the event details modal
    @track newEvent = {}; // Holds the new event details for creation
    @track selectedEvent = {}; // Holds the selected event details for the event details modal
    @track calendarDays = []; // Holds the calendar grid data
    @track formattedMonthYear = ''; // Holds the formatted month and year for the calendar header
    @track events = []; // Stores all events fetched from the Apex controller
    @track filteredEvents = []; // Stores the filtered events after a search
    @track selectedEventType = 'All'; // Tracks the selected event type for filtering
    @track selectedView = 'Monthly'; // Default view is Monthly
    newEventId = '';  // To store the new event Id after creating it
    @track buyerName = '';
    @track buyerEmail = '';
    @track quantity = 1; // Default quantity is 1
    @track ticketType = '';
    @track paymentStatus = '';
    @track eventTypes = [
        { label: 'All', value: 'All' },
        { label: 'Music', value: 'Music' },
        { label: 'Club Party', value: 'Club Party' },
        { label: 'Dance Night', value: 'Dance Night' },
        { label: 'Wedding', value: 'Wedding' },
        { label: 'Birthday Parties', value: 'Birthday Parties' },
        { label: 'Festivals', value: 'Festivals' }
    ];
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
   
    draggedEvent = null; // Holds the event that is being dragged for date change

    currentMonth = new Date().getMonth(); // Tracks the current month for the calendar
    currentYear = new Date().getFullYear(); // Tracks the current year for the calendar
    currentDay = new Date().getDate(); // Tracks the current day for daily view

    eventColors = {
        Music: 'background: linear-gradient(135deg, #0073e6, #00c6ff); color: white;',  // Cool blue gradient for Music events
        'Club Party': 'background: linear-gradient(135deg, #00c9ff, #92fe9d); color: black;',  // Aqua to light green gradient for Club Party
        'Dance Night': 'background: linear-gradient(135deg, #1c1c1c, #434343); color: gold;',  // Dark grey gradient for Dance Night
        Wedding: 'background: linear-gradient(135deg, #ffcc33, #ffb347); color: black;',  // Golden-yellow gradient for Wedding
        'Birthday Parties': 'background: linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b); color: white;',  // Deep purple to peach gradient for Birthday Parties
        Festivals: 'background: linear-gradient(135deg, #36d1dc, #5b86e5); color: white;',  // Aqua to blue gradient for Festivals
        default: 'background: linear-gradient(135deg, #667db6, #0082c8, #667db6); color: white;'  // Cool blue gradient for default
    };
    
    // Lifecycle hook: Runs when the component is inserted into the DOM
    connectedCallback() {
        this.loadEvents();
        this.today = new Date();
    }

    getDayClass(day) {
        return `calendar-day ${day.isToday ? 'today' : ''}`;
    }
    
    async loadEvents() {
        try {
            const data = await getEvents();
            this.events = data.map(event => ({
                id: event.Id,
                name: event.Event_Name__c,
                type: event.Event_Type__c,
                startDate: new Date(event.Event_Start_Date__c),
                endDate: event.Event_End_Date__c,
                description: event.Event_Description__c,
                location: event.Location__c,  // Ensure location is populated here
                meetingLink: event.Meeting_Link__c,  // Ensure meeting link is populated here
                style: this.eventColors[event.Event_Type__c] || this.eventColors.default
            }));
            
            this.filteredEvents = this.events; // Initially show all events
            this.generateCalendar(); // Generate the calendar after loading events
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }
    
    generateCalendar() {
        if (this.selectedView === 'Daily') {
            this.generateDailyView();
        } else if (this.selectedView === 'Weekly') {
            this.generateWeeklyView();
        } else {
            this.generateMonthlyView(new Date(this.currentYear, this.currentMonth));
        }
    }
    
    // Section: Daily view generation
    generateDailyView() {
        const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const eventsForDay = this.getFilteredEventsForDay(currentDate);

        this.calendarDays = [{
            formattedDate: this.currentDay,
            events: eventsForDay,
            dateISO: this.formatDateToLocal(currentDate)
        }];
    }

    // Section: Weekly view generation
    generateWeeklyView() {
        const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const startOfWeek = currentDate.getDate() - currentDate.getDay(); // Get the Sunday of the current week
        let daysArray = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentYear, this.currentMonth, startOfWeek + i);
            const eventsForDay = this.getFilteredEventsForDay(date);

            daysArray.push({
                formattedDate: date.getDate(),
                events: eventsForDay,
                dateISO: this.formatDateToLocal(date)
            });
        }

        this.calendarDays = daysArray;
    }
    
    generateMonthlyView(currentDate) {
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        this.currentMonth = currentMonth;
        this.currentYear = currentYear;
    
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const options = { year: 'numeric', month: 'long' };
        this.formattedMonthYear = new Intl.DateTimeFormat('en-US', options).format(firstDay);
    
        let daysArray = [];
    
        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            daysArray.push({ formattedDate: '', events: [], isToday: false, dayClass: 'calendar-day' });
        }
    
        // Loop through all days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(currentYear, currentMonth, day);
            const eventsForDay = this.getFilteredEventsForDay(date);
    
            // Check if the current date is today
            const isToday = this.isSameDay(date, this.today);
    
            daysArray.push({
                formattedDate: day,
                events: eventsForDay,
                dateISO: this.formatDateToLocal(date),
                isToday: isToday,
                dayClass: isToday ? 'calendar-day today' : 'calendar-day'
            });
        }
    
        this.calendarDays = daysArray;
    }

    // Section: Retrieve events for a specific day based on filtered results
    getFilteredEventsForDay(date) {
        return this.filteredEvents.filter(event => {
            const eventDate = new Date(event.startDate);
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    }

    handleFilterChange(event) {
        this.selectedEventType = event.detail.value;
        this.applySearchAndFilter(); // Apply filtering when event type is changed
    }

    handleSearch() {
        // Apply search logic directly
        this.applySearchAndFilter();
    }
    
    async handleSearchResults(event) {
        const searchEventName = event.detail.eventName.toLowerCase();
        if (searchEventName) {
            try {
                const result = await searchEvents({ eventName: searchEventName });
    
                // Ensure the result is valid
                if (result && result.length > 0) {
                    this.filteredEvents = result.map(event => ({
                        id: event.Id,
                        name: event.Event_Name__c,
                        startDate: new Date(event.Event_Start_Date__c),
                        endDate: new Date(event.Event_End_Date__c),
                        description: event.Event_Description__c
                    }));
                } else {
                    this.filteredEvents = []; // No events found
                }
    
                this.generateCalendar(); // Apply search results to the calendar
            } catch (error) {
                console.error('Error searching events:', error);
            }
        } else {
            this.filteredEvents = this.events; // Reset to all events if search input is empty
            this.generateCalendar();
        }
    }
    
    // Section: Check if two dates are the same
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Section: Handle drag and drop
    handleDragStart(event) {
        const eventId = event.target.dataset.id;
        this.draggedEvent = this.events.find(evt => evt.id === eventId);
    }

    async handleDrop(event) {
        event.preventDefault();
        const droppedDateStr = event.target.closest('.calendar-day').dataset.date;
        const droppedDate = new Date(`${droppedDateStr}T00:00:00`);

        if (this.draggedEvent && droppedDate) {
            await LightningAlert.open({
                message: 'Do you want to update the event?',
                theme: 'info',
                label: 'Confirm Event Move',
            }).then(() => {
                const formattedDate = this.formatDateToLocal(droppedDate);
                this.draggedEvent.startDate = droppedDate;

                updateEventDate({ eventId: this.draggedEvent.id, newStartDate: formattedDate })
                    .then(() => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Success',
                                message: 'Event moved successfully!',
                                variant: 'success'
                            })
                        );
                        window.location.reload(); // Reload to reflect changes
                    })
                    .catch(error => {
                        console.error('Error updating event date:', error);
                    });
            }).catch(() => {
                console.log('Event move cancelled.');
            });
        }
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    // Section: Handle opening the event creation modal
    handleDayClick(event) {
        const clickedDate = event.target.closest('.calendar-day').dataset.date;
        this.newEvent = { startDate: clickedDate };
        this.isCreateModalOpen = true;
    }

    handleSearchInput(event) {
        this.searchInputValue = event.target.value.trim().toLowerCase();
        this.applySearchAndFilter();
    }
    
    applySearchAndFilter() {
        let filtered = this.events;
    
        // Filter by event type
        if (this.selectedEventType !== 'All') {
            filtered = filtered.filter(event => event.type === this.selectedEventType);
        }
    
        // Apply search filter
        if (this.searchInputValue) {
            filtered = filtered.filter(event =>
                event.name.toLowerCase().includes(this.searchInputValue)
            );
        }
    
        // Set filtered events and generate the calendar
        this.filteredEvents = filtered;
        this.generateCalendar();
    }
    
    async saveNewEvent() {
        try {
            // Validate that all required fields are provided
            if (!this.newEvent.startDate) {
                await LightningAlert.open({
                    message: 'Start date is required',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            if (!this.newEvent.endDate) {
                await LightningAlert.open({
                    message: 'End date is required',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            if (!this.newEvent.location) {
                await LightningAlert.open({
                    message: 'Location is required',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            const startTime = this.newEvent.startTime || '00:00';
            const endTime = this.newEvent.endTime || '23:59';
            const startDate = new Date(`${this.newEvent.startDate}T${startTime}`);
            const endDate = new Date(`${this.newEvent.endDate}T${endTime}`);
    
            // Validate that start and end date/times are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                await LightningAlert.open({
                    message: 'Invalid start or end date/time',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            // Destructure and pass required fields to the Apex method
            const { eventName, eventDescription, eventType, location, maxAttendees, price } = this.newEvent;
    
            // Call Apex method to create the event
            const createdEventId = await createEvent({
                eventName,
                eventDescription,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                eventType,
                location, // Passing the location field to Apex
                maxAttendees: parseInt(maxAttendees, 10),
                price: parseFloat(price),
                calendarEventType: 'Party Event' // Pass this dynamically based on the event type
            });
    
            // Store the new event ID
            this.newEventId = createdEventId;
    
            // Show success toast notification
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Event created successfully!',
                    variant: 'success',
                })
            );
    
            // Close the event creation modal
            this.isCreateModalOpen = false;
    
            // Open the ticket booking modal after event creation
            this.selectedEvent = { id: createdEventId, name: eventName }; // Set the newly created event details
            this.isTicketModalOpen = true; // Set the ticket booking modal flag to true
    
        } catch (error) {
            console.error('Error creating event:', error);
    
            // Show error toast notification
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating event',
                    message: error.message || 'Unknown error occurred',
                    variant: 'error',
                })
            );
        }
    }
    

    // Updated: Handle input changes for all form fields including price
    handleInputChange(event) {
        const field = event.target.name;
        this.newEvent[field] = event.target.value; // Handles fields like eventName, description, price, etc.
    }

    // Section: Close the modals
    closeModal() {
        this.isModalOpen = false;
    }

    closeCreateModal() {
        this.isCreateModalOpen = false;
    }

    // Section: Handle event click to open event details modal
    handleEventClick(event) {
        const eventId = event.target.dataset.id;
        this.selectedEvent = this.events.find(evt => evt.id === eventId);
        this.isModalOpen = true;
    }

    // Utility: Format date to 'YYYY-MM-DD'
    formatDateToLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Section: Navigation for previous and next months/days/weeks
    previousMonth() {
        if (this.selectedView === 'Monthly') {
            const currentDate = new Date(this.currentYear, this.currentMonth - 1, 1);
            this.generateMonthlyView(currentDate);
        } else if (this.selectedView === 'Weekly') {
            this.currentDay -= 7;  // Move back one week
            this.generateWeeklyView();
        } else if (this.selectedView === 'Daily') {
            this.currentDay -= 1;  // Move back one day
            this.generateDailyView();
        }
    }

    nextMonth() {
        if (this.selectedView === 'Monthly') {
            const currentDate = new Date(this.currentYear, this.currentMonth + 1, 1);
            this.generateMonthlyView(currentDate);
        } else if (this.selectedView === 'Weekly') {
            this.currentDay += 7;  // Move forward one week
            this.generateWeeklyView();
        } else if (this.selectedView === 'Daily') {
            this.currentDay += 1;  // Move forward one day
            this.generateDailyView();
        }
    }

    // Section: Switch between Daily, Weekly, and Monthly views
    switchView(event) {
        this.selectedView = event.target.dataset.view;
        this.generateCalendar();  // Re-generate the calendar for the new view
    }

   

     // Section: Handle Input Change for Ticket Booking
     handleInputTicketChange(event) {
        const field = event.target.name;
        if (field === 'buyerName') {
            this.buyerName = event.target.value;
        } else if (field === 'buyerEmail') {
            this.buyerEmail = event.target.value;
        } else if (field === 'quantity') {
            this.quantity = event.target.value;
        } else if (field === 'ticketType') {
            this.ticketType = event.target.value;
        } else if (field === 'paymentStatus') {
            this.paymentStatus = event.target.value;
        }
    }

    async saveTicket() {
        try {
            if (!this.buyerName || !this.buyerEmail || !this.quantity || !this.ticketType || !this.paymentStatus) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Please fill in all required fields.',
                        variant: 'error',
                    })
                );
                return; // Exit if any field is missing
            }
    
            const parsedQuantity = parseInt(this.quantity, 10);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Quantity must be a valid positive integer.',
                        variant: 'error',
                    })
                );
                return; // Exit if quantity is invalid
            }
    
            const purchaseDate = new Date();
    
            // Call the Apex method to create the ticket
            await createTicket({
                buyerName: this.buyerName,
                buyerEmail: this.buyerEmail,
                eventId: this.selectedEvent.id,  // Ensure eventId is passed correctly
                quantity: parsedQuantity,
                ticketType: this.ticketType,
                paymentStatus: this.paymentStatus,
                purchaseDate: purchaseDate
            });
    
            // Success notification
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Tickets booked successfully!',
                    variant: 'success',
                })
            );
            
            this.clearFormFields();
    
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message || 'Error booking tickets.',
                    variant: 'error',
                })
            );
            console.error('Error booking tickets:', error);
        }
    }
    
    // Function to clear the form fields
    clearFormFields() {
        this.buyerName = '';
        this.buyerEmail = '';
        this.quantity = '';
        this.ticketType = '';
        this.paymentStatus = '';
    }

    // Section: Open and Close Ticket Modal
openTicketBookingModal() {
    this.isTicketModalOpen = true;
}

closeTicketModal() {
    this.isTicketModalOpen = false; // Close the modal
    window.location.reload(); // Refresh the page
}

    
    
    
}
