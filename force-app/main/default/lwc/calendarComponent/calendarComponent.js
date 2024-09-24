import { LightningElement, track } from 'lwc';
import getEvents from '@salesforce/apex/CalendarController.getEvents';
import updateEventDate from '@salesforce/apex/CalendarController.updateEventDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningAlert from 'lightning/alert';
import createEvent from '@salesforce/apex/CalendarController.createEvent';
import submitRSVP from '@salesforce/apex/RSVPController.submitRSVP';
import searchEvents from '@salesforce/apex/EventController.searchEvents';

export default class CalendarComponent extends LightningElement {
    // Modal control variables
    @track isCreateModalOpen = false;
    @track isModalOpen = false;
    @track isRSVPModalOpen = false;

    // Event and RSVP-related variables
    @track newEvent = {}; // Holds data for new events
    @track selectedEvent = {}; // Holds selected event details for the modal
    @track events = []; // Stores all events
    @track filteredEvents = []; // Stores filtered events after a search
    @track newEventId = ''; // Stores the event ID after creation
    @track attendeeName = '';
    @track attendeeEmail = '';
    @track attendeePhone = '';

    // Calendar-related variables
    @track calendarDays = [];
    @track formattedMonthYear = '';
    @track selectedView = 'Monthly'; // Default calendar view
    @track selectedEventType = 'All'; // Default event type for filtering

    // Event types and recurrence options
    @track eventTypes = [
        { label: 'All', value: 'All' },
        { label: 'Webinar', value: 'Webinar' },
        { label: 'Workshop', value: 'Workshop' },
        { label: 'Conference', value: 'Conference' },
        { label: 'General Meetings', value: 'General Meetings' },
        { label: 'Seminar', value: 'Seminar' }
    ];
    @track recurrenceOptions = [
        { label: 'None', value: 'None' },
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' }
    ];

    // Date tracking for navigation
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    currentDay = new Date().getDate();
    today = new Date(); // Tracks today's date

    // Dragged event for handling drag-and-drop functionality
    draggedEvent = null;

    // Color mapping for event types
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
    }

    /**
     * Fetches events from the server and stores them in `events` and `filteredEvents`.
     */
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
                location: event.Location__c,
                meetingLink: event.Meeting_Link__c,
                style: this.eventColors[event.Event_Type__c] || this.eventColors.default
            }));
            this.filteredEvents = this.events; // Initially, show all events
            this.generateCalendar(); // Generate the calendar view
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    /**
     * Generates the calendar based on the selected view (Daily, Weekly, or Monthly).
     */
    generateCalendar() {
        if (this.selectedView === 'Daily') {
            this.generateDailyView();
        } else if (this.selectedView === 'Weekly') {
            this.generateWeeklyView();
        } else {
            this.generateMonthlyView(new Date(this.currentYear, this.currentMonth));
        }
    }

    /**
     * Generates a daily view for the calendar.
     */
    generateDailyView() {
        const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const eventsForDay = this.getFilteredEventsForDay(currentDate);

        this.calendarDays = [{
            formattedDate: this.currentDay,
            events: eventsForDay,
            dateISO: this.formatDateToLocal(currentDate)
        }];
    }

    /**
     * Generates a weekly view for the calendar.
     */
    generateWeeklyView() {
        const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const startOfWeek = currentDate.getDate() - currentDate.getDay();
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

    /**
     * Generates a monthly view for the calendar.
     * @param {Date} currentDate - The date representing the current month.
     */
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

    // Filtering and Search Handling
    handleFilterChange(event) {
        this.selectedEventType = event.detail.value;
        this.applySearchAndFilter();
    }

    handleSearchInput(event) {
        this.searchInputValue = event.target.value.trim().toLowerCase();
        this.applySearchAndFilter();
    }

    async handleSearchResults(event) {
        const searchEventName = event.detail.eventName.toLowerCase();
        if (searchEventName) {
            try {
                const result = await searchEvents({ eventName: searchEventName });
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
                this.generateCalendar();
            } catch (error) {
                console.error('Error searching events:', error);
            }
        } else {
            this.filteredEvents = this.events; // Reset to all events if search input is empty
            this.generateCalendar();
        }
    }

    applySearchAndFilter() {
        let filtered = this.events;

        // Filter by event type
        if (this.selectedEventType !== 'All') {
            filtered = filtered.filter(event => event.type === this.selectedEventType);
        }

        // Apply search filter
        if (this.searchInputValue) {
            filtered = filtered.filter(event => event.name.toLowerCase().includes(this.searchInputValue));
        }

        this.filteredEvents = filtered;
        this.generateCalendar();
    }

    // Event Creation and RSVP Handling
    async saveNewEvent() {
        try {
            const { eventName, eventDescription, eventType, location, maxAttendees, meetingLink, recurrence } = this.newEvent;
            const startDate = new Date(`${this.newEvent.startDate}T${this.newEvent.startTime || '00:00'}`);
            const endDate = new Date(`${this.newEvent.endDate}T${this.newEvent.endTime || '23:59'}`);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                await LightningAlert.open({
                    message: 'Invalid start or end date/time',
                    theme: 'error',
                    label: 'Validation Error',
                });
                return;
            }

            const createdEventId = await createEvent({
                eventName,
                eventDescription,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                eventType,
                location,
                maxAttendees: parseInt(maxAttendees, 10),
                meetingLink,
                recurrence
            });

            this.newEventId = createdEventId;
            this.showToast('Success', 'Event created successfully!', 'success');

            this.isCreateModalOpen = false;
            this.isRSVPModalOpen = true; // Open RSVP modal after event creation
            this.loadEvents(); // Reload the events without refreshing the page
        } catch (error) {
            this.showToast('Error creating event', error.message || 'Unknown error occurred', 'error');
        }
    }

    async submitRSVP(addAnother = false) {
        try {
            if (!this.attendeeName || !this.attendeeEmail || !this.attendeePhone) {
                throw new Error('All RSVP fields are required');
            }

            await submitRSVP({
                eventId: this.newEventId,
                attendeeName: this.attendeeName,
                attendeeEmail: this.attendeeEmail,
                attendeePhone: this.attendeePhone
            });

            this.showToast('Success', 'RSVP submitted successfully!', 'success');

            if (addAnother) {
                this.clearRSVPForm();
            } else {
                this.closeRSVPModal();
            }
        } catch (error) {
            this.showToast('Error submitting RSVP', error.message || 'Unknown error occurred', 'error');
        }
    }

    submitRSVPAddAnother() {
        this.submitRSVP(true);
    }

    clearRSVPForm() {
        this.attendeeName = '';
        this.attendeeEmail = '';
        this.attendeePhone = '';
    }

    closeRSVPModal() {
        this.isRSVPModalOpen = false;
        this.clearRSVPForm();
        window.location.reload(); // Reload the page after closing the RSVP modal
    }

    // Utility Functions
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }

    formatDateToLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Calendar Navigation
    previousMonth() {
        if (this.selectedView === 'Monthly') {
            this.generateMonthlyView(new Date(this.currentYear, this.currentMonth - 1));
        } else if (this.selectedView === 'Weekly') {
            this.currentDay -= 7;
            this.generateWeeklyView();
        } else {
            this.currentDay -= 1;
            this.generateDailyView();
        }
    }

    nextMonth() {
        if (this.selectedView === 'Monthly') {
            this.generateMonthlyView(new Date(this.currentYear, this.currentMonth + 1));
        } else if (this.selectedView === 'Weekly') {
            this.currentDay += 7;
            this.generateWeeklyView();
        } else {
            this.currentDay += 1;
            this.generateDailyView();
        }
    }

    switchView(event) {
        this.selectedView = event.target.dataset.view;
        this.generateCalendar();
    }

    // Drag and Drop Handlers
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
                        this.showToast('Success', 'Event moved successfully!', 'success');
                        this.loadEvents(); // Reload events after moving one
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

    // Modal Handlers
    closeModal() {
        this.isModalOpen = false;
    }

    closeCreateModal() {
        this.isCreateModalOpen = false;
    }

    handleEventClick(event) {
        const eventId = event.target.dataset.id;
        this.selectedEvent = this.events.find(evt => evt.id === eventId);
        this.isModalOpen = true;
    }
}
