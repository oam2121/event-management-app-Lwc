public with sharing class PaymentController {

    // Method to fetch payment details based on the ticketId
    @AuraEnabled(cacheable=true)
    public static Ticket__c getPaymentDetails(Id ticketId) {
        try {
            // Fetch ticket details, including Total_Amount__c, Buyer_Name__c, and Buyer_Email__c
            Ticket__c ticket = [SELECT Id, Buyer_Name__c, Buyer_Email__c, Total_Amount__c 
                                FROM Ticket__c 
                                WHERE Id = :ticketId 
                                LIMIT 1];
                                
            // Return the ticket object to the LWC
            return ticket;

        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving payment details: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static Boolean savePayment(Map<String, Object> paymentDetails) {
        try {
            // Log the input payment details for debugging
            System.debug('Payment Details: ' + paymentDetails);
    
            // Ensure the ticketId is not null
            Id ticketId = (Id) paymentDetails.get('ticketId');
            if (ticketId == null) {
                throw new AuraHandledException('Ticket ID is missing');
            }
    
            // Fetch the related Ticket__c record and its Event__c relationship
            Ticket__c ticket = [SELECT Id, Payment_Status__c, Event__c FROM Ticket__c WHERE Id = :ticketId LIMIT 1];
            
            // Create a new DummyPayment__c record
            DummyPayment__c payment = new DummyPayment__c();
            payment.Payment_Type__c = (String) paymentDetails.get('paymentType');
    
            // Conditionally set Card details if it's not UPI
            String paymentType = (String) paymentDetails.get('paymentType');
            if (paymentType != 'UPI') {
                // Process card details only if payment is via card
                String cardNumber = (String) paymentDetails.get('cardNumber');
                if (cardNumber != null && !String.isBlank(cardNumber)) {
                    payment.Card_Number__c = cardNumber;
                }
    
                String expiryDate = (String) paymentDetails.get('expiryDate');
                if (expiryDate != null && !String.isBlank(expiryDate)) {
                    payment.Expiry_Date__c = Date.valueOf(expiryDate);
                }
    
                String cvv = (String) paymentDetails.get('cvv');
                if (cvv != null && !String.isBlank(cvv)) {
                    payment.CVV__c = cvv;
                }
            } else {
                // Process UPI details only if payment is via UPI
                String upiId = (String) paymentDetails.get('upiId');
                if (upiId != null && !String.isBlank(upiId)) {
                    payment.UPI_ID__c = upiId;
                }
            }
    
            // Set the Ticket__c relationship and Event__c from the ticket
            payment.Ticket__c = ticketId;
            payment.Event__c = ticket.Event__c;
    
            // Set the current date and time for Payment_Date__c
            payment.Payment_Date__c = System.now();
    
            // Insert the payment record
            insert payment;
    
            // Update the Payment Status on the related Ticket__c record
            ticket.Payment_Status__c = 'Paid';
            update ticket;
    
            return true;
    
        } catch (Exception e) {
            // Log the error and throw it for the frontend to catch
            System.debug('Error during payment processing: ' + e.getMessage());
            throw new AuraHandledException('Error processing payment: ' + e.getMessage());
        }
    }
    
    
}
