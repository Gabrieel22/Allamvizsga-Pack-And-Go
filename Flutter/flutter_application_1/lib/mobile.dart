import 'package:flutter/material.dart';

class MobileHomePage extends StatefulWidget {
  @override
  _MobileHomePageState createState() => _MobileHomePageState();
}

class _MobileHomePageState extends State<MobileHomePage> {
  final TextEditingController _fromController = TextEditingController();
  final TextEditingController _toController = TextEditingController();
  DateTime _departureDate = DateTime.now();
  DateTime? _returnDate;
  bool _isReturn = true;  // Track whether "Return" is selected

  Future<void> _selectDate(BuildContext context, bool isDeparture) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isDeparture ? _departureDate : (_returnDate ?? DateTime.now()),
      firstDate: DateTime.now(),
      lastDate: DateTime(2025),
    );
    if (picked != null) {
      setState(() {
        if (isDeparture) {
          _departureDate = picked;
        } else {
          _returnDate = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    double screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      body: Stack(
        children: <Widget>[
          // Background image
          Container(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: AssetImage("assets/pictures/background.jpg"),
                fit: BoxFit.cover,
              ),
            ),
          ),
          // Logo in the top left corner
          Positioned(
            top: 16,
            left: 16,
            child: Image.asset(
              'assets/pictures/logo.png',
              width: 80,
              height: 80,
            ),
          ),
          // Centered content
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  // Main title
                  Text(
                    'Discover how to get anywhere',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  // Subtitle
                  Text(
                    'BY PLANE, TRAIN, BUS, FERRY AND CAR',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 20),
                  // Search box container
                  Container(
                    width: screenWidth * 0.9,
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: <Widget>[
                        // "Return" or "One-way" selector
                        Row(
                          children: [
                            Radio<bool>(
                              value: true,
                              groupValue: _isReturn,
                              onChanged: (value) {
                                setState(() {
                                  _isReturn = true;
                                  _returnDate = null;  // Reset return date when switching to return
                                });
                              },
                            ),
                            Text('Return'),
                            SizedBox(width: 20),
                            Radio<bool>(
                              value: false,
                              groupValue: _isReturn,
                              onChanged: (value) {
                                setState(() {
                                  _isReturn = false;
                                  _returnDate = null;  // Ensure return date is not selected
                                });
                              },
                            ),
                            Text('One-way'),
                          ],
                        ),
                        SizedBox(height: 16),
                        // "Travel From" input
                        TextField(
                          controller: _fromController,
                          decoration: InputDecoration(
                            labelText: 'TRAVEL FROM',
                            border: OutlineInputBorder(),
                            labelStyle: TextStyle(color: Colors.grey),
                          ),
                        ),
                        SizedBox(height: 16),
                        // "To" input
                        TextField(
                          controller: _toController,
                          decoration: InputDecoration(
                            labelText: 'TO',
                            border: OutlineInputBorder(),
                            labelStyle: TextStyle(color: Colors.grey),
                          ),
                        ),
                        SizedBox(height: 16),
                        // Departure and Return date pickers
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => _selectDate(context, true),
                                child: InputDecorator(
                                  decoration: InputDecoration(
                                    labelText: 'Departure',
                                    border: OutlineInputBorder(),
                                  ),
                                  child: Text(
                                    "${_departureDate.toLocal()}".split(' ')[0],
                                  ),
                                ),
                              ),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: GestureDetector(
                                onTap: _isReturn ? () => _selectDate(context, false) : null,
                                child: InputDecorator(
                                  decoration: InputDecoration(
                                    labelText: 'Return',
                                    border: OutlineInputBorder(),
                                  ),
                                  child: Text(
                                    _returnDate != null
                                        ? "${_returnDate!.toLocal()}".split(' ')[0]
                                        : 'Select date',
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        // Search button
                        ElevatedButton.icon(
                          onPressed: () {
                            // Function to handle search
                          },
                          icon: Icon(Icons.search, color: Colors.white),
                          label: Text(
                            'See all options',
                            style: TextStyle(fontSize: 16, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.pink,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: EdgeInsets.symmetric(
                              vertical: 14.0,
                              horizontal: 32.0,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 20),
                  // Row of icons for travel options (2x2 layout for mobile)
                  Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildOptionIcon(
                            icon: Icons.train,
                            color: Colors.purple,
                            label: '198,965 Train Lines',
                            subLabel: 'via 6,002 operators',
                          ),
                          _buildOptionIcon(
                            icon: Icons.directions_bus,
                            color: Colors.orange,
                            label: '969,666 Bus Routes',
                            subLabel: 'via 79,538 operators',
                          ),
                        ],
                      ),
                      SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildOptionIcon(
                            icon: Icons.directions_boat,
                            color: Colors.blue,
                            label: '13,273 Ferries',
                            subLabel: 'via 4,289 operators',
                          ),
                          _buildOptionIcon(
                            icon: Icons.flight,
                            color: Colors.teal,
                            label: '53,682 Flights',
                            subLabel: 'via 1,162 airlines',
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionIcon({
    required IconData icon,
    required Color color,
    required String label,
    String? subLabel,
  }) {
    return Container(
      width: 155, // Adjust width for mobile
      height: 155, // Adjust height for mobile
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.75), // Semi-transparent background
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 6,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 50), // Adjust icon size for mobile
          SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 15, // Adjust font size for label
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            textAlign: TextAlign.center,
          ),
          if (subLabel != null) // Display subLabel if exists
            Text(
              subLabel,
              style: TextStyle(
                fontSize: 14, // Adjust font size for subLabel
                color: Colors.black54,
              ),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }
}