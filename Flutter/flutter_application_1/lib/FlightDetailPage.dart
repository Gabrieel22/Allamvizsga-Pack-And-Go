import 'dart:math';
import 'package:flutter/material.dart';

class FlightDetailPage extends StatefulWidget {
  final dynamic flight;

  const FlightDetailPage({Key? key, required this.flight}) : super(key: key);

  @override
  _FlightDetailPageState createState() => _FlightDetailPageState();
}

class _FlightDetailPageState extends State<FlightDetailPage> {
  String? _selectedPaymentMethod;
  String? _cashCode; // For storing the generated code for cash payment
  final _paymentMethods = ['Cash', 'PayPal', 'Credit Card'];
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _cardNumberController = TextEditingController();
  final TextEditingController _expiryDateController = TextEditingController();
  final TextEditingController _cvvController = TextEditingController();
  final TextEditingController _paypalEmailController = TextEditingController();
  final TextEditingController _cashAmountController = TextEditingController();

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryDateController.dispose();
    _cvvController.dispose();
    _paypalEmailController.dispose();
    _cashAmountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final flight = widget.flight;
    final itineraries = flight['itineraries'];
    final price = flight['price'];

    if (itineraries == null || itineraries.isEmpty || price == null) {
      return _buildEmptyPage();
    }

    final itinerary = itineraries[0];
    final segments = itinerary['segments'];
    final departure = segments.isNotEmpty ? segments[0]['departure'] : null;
    final arrival = segments.length > 1 ? segments[1]['arrival'] : null;

    return Scaffold(
      appBar: _buildAppBar(),
      body: Stack(
        children: [
          _buildBackgroundImage(), // Background image
          Center(
            child: SingleChildScrollView(
              child: Container(
                width: MediaQuery.of(context).size.width * 0.9,
                padding: EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFlightDetails(departure, arrival, flight, itinerary, price),
                    SizedBox(height: 20),
                    _buildPaymentSection(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackgroundImage() {
    return Positioned.fill(
      child: Image.asset(
        'assets/pictures/background.jpg', // Add your background image asset
        fit: BoxFit.cover,
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() => AppBar(
        title: Text('Flight Detail', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.deepPurple,
        centerTitle: true,
      );

  Widget _buildEmptyPage() => Scaffold(
        appBar: _buildAppBar(),
        body: Center(
          child: Text('No flight details available', style: TextStyle(fontSize: 20)),
        ),
      );

  Widget _buildFlightDetails(dynamic departure, dynamic arrival, dynamic flight, dynamic itinerary, dynamic price) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildDetailRow("Flight ID", flight['id']?.toString() ?? 'N/A'),
        _buildDetailRow("Airline", flight['validatingAirlineCodes'] != null && flight['validatingAirlineCodes'].isNotEmpty ? flight['validatingAirlineCodes'][0] : 'N/A'),
        _buildDetailRow("Departure", departure != null ? '${departure['iataCode']} at ${departure['at']}' : 'N/A'),
        _buildDetailRow("Arrival", arrival != null ? '${arrival['iataCode']} at ${arrival['at']}' : 'N/A'),
        _buildDetailRow("Price", '${price['currency'] ?? 'N/A'} ${price['grandTotal']?.toString() ?? 'N/A'}', isBold: true),
        _buildDetailRow("Duration", itinerary['duration']?.toString() ?? 'N/A'),
        _buildDetailRow("Bookable Seats", flight['numberOfBookableSeats']?.toString() ?? 'N/A'),
        _buildDetailRow("Last Ticketing Date", flight['lastTicketingDate'] ?? 'N/A'),
        if (price['additionalServices'] != null && price['additionalServices'].isNotEmpty)
          _buildDetailRow(
            "Additional Services",
            '${price['additionalServices'][0]['type'] ?? 'N/A'} - ${price['additionalServices'][0]['amount']?.toString() ?? 'N/A'}',
          ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: RichText(
        text: TextSpan(
          style: TextStyle(color: Colors.black, fontSize: 16),
          children: [
            TextSpan(text: '$label: ', style: TextStyle(fontWeight: FontWeight.bold)),
            TextSpan(text: value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Payment Method:',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedPaymentMethod,
          hint: Text('Choose a payment method'),
          items: _paymentMethods.map((method) {
            return DropdownMenuItem<String>(
              value: method,
              child: Text(method),
            );
          }).toList(),
          onChanged: (value) {
            setState(() {
              _selectedPaymentMethod = value;
              if (value == 'Cash') {
                _generateCashCode();
              }
            });
          },
          decoration: InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(vertical: 15.0),
          ),
        ),
        SizedBox(height: 16),
        if (_selectedPaymentMethod != null) _buildPaymentForm(),
      ],
    );
  }

  Widget _buildPaymentForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          if (_selectedPaymentMethod == 'Credit Card') _buildCreditCardForm(),
          if (_selectedPaymentMethod == 'PayPal') _buildPayPalForm(),
          if (_selectedPaymentMethod == 'Cash') _buildCashForm(),
          if (_cashCode != null)
            Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Text(
                'Cash Payment Code: $_cashCode',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
              ),
            ),
          SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepPurple,
              foregroundColor: Colors.white,
              padding: EdgeInsets.symmetric(vertical: 15, horizontal: 30),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Processing Payment...')));
              }
            },
            child: Text('Submit Payment', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
  }

  void _generateCashCode() {
    final random = Random();
    _cashCode = List.generate(6, (index) => random.nextInt(10)).join();
  }

  Widget _buildCreditCardForm() {
    return Column(
      children: [
        _buildTextFormField('Card Number', _cardNumberController, TextInputType.number, 'Please enter a card number'),
        _buildTextFormField('Expiry Date', _expiryDateController, TextInputType.datetime, 'Please enter the expiry date'),
        _buildTextFormField('CVV', _cvvController, TextInputType.number, 'Please enter the CVV'),
      ],
    );
  }

  Widget _buildPayPalForm() {
    return _buildTextFormField('PayPal Email', _paypalEmailController, TextInputType.emailAddress, 'Please enter your PayPal email');
  }

  Widget _buildCashForm() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(
        'Show the code at reception',
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black),
        textAlign: TextAlign.center,
      ),
    );
  }


  Widget _buildTextFormField(String label, TextEditingController controller, TextInputType keyboardType, String validationMessage) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(),
      ),
      keyboardType: keyboardType,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return validationMessage;
        }
        return null;
      },
    );
  }
}
