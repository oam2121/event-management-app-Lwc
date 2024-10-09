@RestResource(urlMapping='/EventAPI/*')
global with sharing class EventAPI {

    @HttpPost
    global static String createEvent(String eventName, String eventDescription, String startDate, String endDate, String location, Integer maxAttendees, String eventType) {
        Map<String, Object> eventData = new Map<String, Object>{
            'eventName' => eventName,
            'eventDescription' => eventDescription,
            'startDate' => startDate,
            'endDate' => endDate,
            'location' => location,
            'maxAttendees' => maxAttendees,
            'eventType' => eventType
        };
        
        try {
            Id eventId = EventController.createEvent(eventData);
            return eventId;
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
    
    // You can add more methods here to wrap other functionalities of EventController
}
