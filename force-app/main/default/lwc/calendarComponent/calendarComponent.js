import { LightningElement, track } from 'lwc';
import getEvents from '@salesforce/apex/CalendarController.getEvents';
import updateEventDate from '@salesforce/apex/CalendarController.updateEventDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningAlert from 'lightning/alert';
import createEvent from '@salesforce/apex/CalendarController.createEvent';
import submitRSVP from '@salesforce/apex/RSVPController.submitRSVP';  // <-- Make sure this import is present
import searchEvents from '@salesforce/apex/EventController.searchEvents'; // Fetch the filtered events by search

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
    @track isRSVPModalOpen = false;
    @track attendeeName = '';
    @track attendeeEmail = '';
    @track attendeePhone = '';
    @track meetingLink
    newEventId = '';  // To store the new event Id after creating it
    @track eventTypes = [
        { label: 'All', value: 'All' },
        { label: 'Webinar', value: 'Webinar' },
        { label: 'Workshop', value: 'Workshop' },
        { label: 'Conference', value: 'Conference' },
        { label: 'General Meetings', value: 'General Meetings' },
        { label: 'Seminar', value: 'Seminar' }
    ];

    draggedEvent = null; // Holds the event that is being dragged for date change

    currentMonth = new Date().getMonth(); // Tracks the current month for the calendar
    currentYear = new Date().getFullYear(); // Tracks the current year for the calendar
    currentDay = new Date().getDate(); // Tracks the current day for daily view

    // Section: Color mapping for different event types
    eventColors = {
        Webinar: 'background-color: #ff4c4c; color: white;',
        Workshop: 'background-color: #4caf50; color: white;',
        Conference: 'background-color: #2196f3; color: white;',
        'General Meetings': 'background-color: #ffeb3b; color: black;',
        Seminar: 'background-color: #9c27b0; color: white;',
        default: 'background-color: #607d8b; color: white;'
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
            // Validate and ensure startDate and endDate exist
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
    
            const startTime = this.newEvent.startTime || '00:00';
            const endTime = this.newEvent.endTime || '23:59';
            const startDate = new Date(`${this.newEvent.startDate}T${startTime}`);
            const endDate = new Date(`${this.newEvent.endDate}T${endTime}`);
    
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                await LightningAlert.open({
                    message: 'Invalid start or end date/time',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            if (startDate < new Date()) {
                await LightningAlert.open({
                    message: 'The start date cannot be in the past.',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            if (endDate < startDate) {
                await LightningAlert.open({
                    message: 'The end date cannot be earlier than the start date.',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }
    
            const { eventName, eventDescription, eventType, location, maxAttendees, meetingLink } = this.newEvent;
    
            const createdEventId = await createEvent({
                eventName,
                eventDescription,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                eventType,
                location,
                maxAttendees: parseInt(maxAttendees, 10),
                meetingLink  // Add meetingLink here
            });
    
            this.newEventId = createdEventId;  // Store the event ID for RSVP submission
    
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Event created successfully!',
                    variant: 'success',
                })
            );
    
            // Open RSVP modal after event creation
            this.isCreateModalOpen = false;
            this.isRSVPModalOpen = true;  // Open the RSVP modal to collect attendee info
    
            this.loadEvents(); // Reload the events without reloading the page
    
        } catch (error) {
            console.error('Error creating event:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating event',
                    message: error.message || 'Unknown error occurred',
                    variant: 'error',
                })
            );
        }
    }
    
    // Submit RSVP and clear the form for another entry
async submitRSVP(addAnother = false) {
    try {
        if (!this.attendeeName || !this.attendeeEmail || !this.attendeePhone) {
            throw new Error('All RSVP fields are required');
        }

        await submitRSVP({
            eventId: this.newEventId,
            attendeeName: this.attendeeName,
            attendeeEmail: this.attendeeEmail,
            attendeePhone: this.attendeePhone,
        });

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'RSVP submitted successfully!',
                variant: 'success',
            })
        );

        if (addAnother) {
            // Clear the form but keep the modal open for adding another attendee
            this.clearRSVPForm();
        } else {
      
            this.closeRSVPModal();
           

        }

    } catch (error) {
        console.error('Error submitting RSVP:', error);
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error submitting RSVP',
                message: error.message || 'Unknown error occurred',
                variant: 'error',
            })
        );
    }
}


    // New helper method for adding another attendee
submitRSVPAddAnother() {
    this.submitRSVP(true);
}

// Method to clear the RSVP form
clearRSVPForm() {
    this.attendeeName = '';
    this.attendeeEmail = '';
    this.attendeePhone = '';
}



    // Handle input changes for RSVP modal
    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'attendeeName') {
            this.attendeeName = event.target.value;
        } else if (field === 'attendeeEmail') {
            this.attendeeEmail = event.target.value;
        } else if (field === 'attendeePhone') {
            this.attendeePhone = event.target.value;
        } else {
            this.newEvent[field] = event.target.value;
        }
    }

// Close RSVP modal and refresh the page
closeRSVPModal() {
    this.isRSVPModalOpen = false;
    this.clearRSVPForm(); // Clear the form when closing the modal

    // Trigger a page reload when the modal is closed
    window.location.reload();
}


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
}
