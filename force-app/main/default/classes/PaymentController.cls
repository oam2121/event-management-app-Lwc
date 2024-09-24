public with sharing class PaymentController {

    /**
     * Fetches payment details based on the ticket ID.
     * 
     * @param ticketId The ID of the Ticket__c record to retrieve payment details.
     * @return The Ticket__c record containing buyer information and total amount.
     */
    @AuraEnabled(cacheable=true)
    public static Ticket__c getPaymentDetails(Id ticketId) {
        try {
            // Query to fetch the ticket details, including Buyer_Name__c, Buyer_Email__c, and Total_Amount__c
            Ticket__c ticket = [SELECT Id, Buyer_Name__c, Buyer_Email__c, Total_Amount__c 
                                FROM Ticket__c 
                                WHERE Id = :ticketId 
                                LIMIT 1];
            
            // Return the ticket details to the frontend (LWC)
            return ticket;

        } catch (Exception e) {
            // Handle any exceptions and provide a user-friendly message
            throw new AuraHandledException('Error retrieving payment details: ' + e.getMessage());
        }
    }

    /**
     * Saves payment information and updates the ticket's payment status.
     * 
     * @param paymentDetails A map containing payment-related data, including payment type, card/UPI details, etc.
     * @return Boolean indicating whether the payment was successfully processed.
     */
    @AuraEnabled
    public static Boolean savePayment(Map<String, Object> paymentDetails) {
        try {
            // Log the input payment details for debugging purposes
            System.debug('Payment Details: ' + paymentDetails);

            // Extract the ticketId from the paymentDetails map
            Id ticketId = (Id) paymentDetails.get('ticketId');
            if (ticketId == null) {
                throw new AuraHandledException('Ticket ID is missing.');
            }

            // Fetch the related Ticket__c record and Event__c relationship
            Ticket__c ticket = [SELECT Id, Payment_Status__c, Event__c 
                                FROM Ticket__c 
                                WHERE Id = :ticketId 
                                LIMIT 1];

            // Create a new DummyPayment__c record to store payment details
            DummyPayment__c payment = new DummyPayment__c();
            payment.Payment_Type__c = (String) paymentDetails.get('paymentType');

            // Determine the payment type (Card or UPI) and set relevant fields accordingly
            String paymentType = (String) paymentDetails.get('paymentType');
            if (paymentType != 'UPI') {
                // Process card details for non-UPI payments
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
                // Process UPI details for UPI payments
                String upiId = (String) paymentDetails.get('upiId');
                if (upiId != null && !String.isBlank(upiId)) {
                    payment.UPI_ID__c = upiId;
                }
            }

            // Set the Ticket__c relationship and Event__c from the fetched ticket
            payment.Ticket__c = ticketId;
            payment.Event__c = ticket.Event__c;

            // Set the current date and time as the payment date
            payment.Payment_Date__c = System.now();

            // Insert the payment record into DummyPayment__c
            insert payment;

            // Update the payment status on the related Ticket__c record to 'Paid'
            ticket.Payment_Status__c = 'Paid';
            update ticket;

            // Return true indicating successful payment processing
            return true;

        } catch (Exception e) {
            // Log the error for debugging purposes and throw a user-friendly error message
            System.debug('Error during payment processing: ' + e.getMessage());
            throw new AuraHandledException('Error processing payment: ' + e.getMessage());
        }
    }
}
