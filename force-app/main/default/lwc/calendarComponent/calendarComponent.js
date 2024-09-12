import { LightningElement, track } from 'lwc';
import getEvents from '@salesforce/apex/CalendarController.getEvents';
import updateEventDate from '@salesforce/apex/CalendarController.updateEventDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningAlert from 'lightning/alert';
import createEvent from '@salesforce/apex/CalendarController.createEvent';


export default class CalendarComponent extends LightningElement {
    // Section: Track variables for modal, events, calendar, and filtering
    @track isCreateModalOpen = false; // Controls the visibility of the create event modal
    @track isModalOpen = false; // Controls the visibility of the event details modal
    @track newEvent = {}; // Holds the new event details for creation
    @track selectedEvent = {}; // Holds the selected event details for the event details modal
    @track calendarDays = []; // Holds the calendar grid data
    @track formattedMonthYear = ''; // Holds the formatted month and year for the calendar header
    @track events = []; // Stores all events fetched from the Apex controller
    @track selectedEventType = 'All'; // Tracks the selected event type for filtering
    @track selectedView = 'Monthly'; // Default view is Monthly
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
    }

    // Section: Load events from Apex
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
                style: this.eventColors[event.Event_Type__c] || this.eventColors.default
            }));
            this.generateCalendar(); // Generate the calendar after loading events
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // Set the view class for buttons
    get dailyViewVariant() {
        return this.selectedView === 'Daily' ? 'brand' : 'neutral';
    }

    get weeklyViewVariant() {
        return this.selectedView === 'Weekly' ? 'brand' : 'neutral';
    }

    get monthlyViewVariant() {
        return this.selectedView === 'Monthly' ? 'brand' : 'neutral';
    }

    // Section: Generate the calendar based on the selected view
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

    // Section: Monthly view generation
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

        for (let i = 0; i < firstDay.getDay(); i++) {
            daysArray.push({ formattedDate: '', events: [] });
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(currentYear, currentMonth, day);
            const eventsForDay = this.getFilteredEventsForDay(date);

            daysArray.push({
                formattedDate: day,
                events: eventsForDay,
                dateISO: this.formatDateToLocal(date)
            });
        }

        this.calendarDays = daysArray;
    }

    // Section: Handle the event type filtering
    handleFilterChange(event) {
        this.selectedEventType = event.detail.value;
        this.loadEvents(); // Reload events to apply the filter
    }

    // Section: Check if two dates are the same
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Section: Retrieve events for a specific day
    getFilteredEventsForDay(date) {
        let eventsForDay = this.events.filter(event => this.isSameDay(event.startDate, date));
        if (this.selectedEventType !== 'All') {
            eventsForDay = eventsForDay.filter(event => event.type === this.selectedEventType);
        }
        return eventsForDay;
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

    // Section: Handle form inputs for new event creation
    handleInputChange(event) {
        const field = event.target.name;
        this.newEvent[field] = event.target.value;
    }

// Section: Save new event
async saveNewEvent() {
    try {
        // Validate and ensure startDate and startTime exist
        if (!this.newEvent.startDate) {
            throw new Error('Start date is required');
        }

        if (!this.newEvent.endDate) {
            throw new Error('End date is required');
        }

        // Default time values if not provided
        const startTime = this.newEvent.startTime || '00:00'; // Default to midnight if no time provided
        const endTime = this.newEvent.endTime || '23:59';     // Default to end of day if no time provided

        // Combine the date and time to construct the DateTime
        const startDate = new Date(`${this.newEvent.startDate}T${startTime}`);
        const endDate = new Date(`${this.newEvent.endDate}T${endTime}`);

        // Ensure startDate and endDate are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid start or end date/time');
        }

        const { eventName, eventDescription, eventType, location, maxAttendees } = this.newEvent;

        console.log('Event being sent to Apex:', {
            eventName,
            eventDescription,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            eventType,
            location,
            maxAttendees: parseInt(maxAttendees, 10)
        });

        // Call the Apex method to create the event
        await createEvent({
            eventName,
            eventDescription,
            startDate: startDate.toISOString(),  // Convert to ISO string for DateTime
            endDate: endDate.toISOString(),      // Convert to ISO string for DateTime
            eventType,
            location,
            maxAttendees: parseInt(maxAttendees, 10)
        });

        // Show success message and reload events
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Event created successfully!',
                variant: 'success'
            })
        );
        window.location.reload(); // Reload to reflect changes

        this.isCreateModalOpen = false; // Close the modal
        this.loadEvents(); // Reload the events
    } catch (error) {
        console.error('Error creating event:', error);
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error creating event',
                message: error.message,
                variant: 'error'
            })
        );
    }
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
