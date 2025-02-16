import 'package:flutter/material.dart';
import 'package:flutter_application_1/LoginPage.dart';
import 'mobile.dart';
import 'dart:convert'; // API válaszok feldolgozásához
import 'package:http/http.dart' as http; // HTTP kérésekhez
import 'FlightResultsPage.dart';
import 'ProfilePage.dart';
import 'LoginPage.dart';
import 'package:shared_preferences/shared_preferences.dart'; // SharedPreferences importálása
  
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SharedPreferences prefs = await SharedPreferences.getInstance();
  bool isLoggedIn = prefs.getBool('isLoggedIn') ?? false;

  runApp(MyApp(isLoggedIn: isLoggedIn));
}

class MyApp extends StatelessWidget {
  final bool isLoggedIn;

  MyApp({required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'PackAndGo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: isLoggedIn ? HomePage() : HomePage(), // Kezdő képernyő
      routes: {
        '/homepage': (context) => HomePage(),
        '/profile': (context) => ProfilePage(),
        '/login': (context) => Loginpage(),
      },
    );
  }
}


class ResponsiveHomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    bool isMobile = MediaQuery.of(context).size.width < 600;

    return isMobile ? MobileHomePage() : HomePage();
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}


class _HomePageState extends State<HomePage> {
  final TextEditingController _fromController = TextEditingController();
  final TextEditingController _toController = TextEditingController();
  DateTime _departureDate = DateTime.now();
  DateTime? _returnDate;
  int _adults = 1;
  int _children = 0;
  bool _isPassengersDropdownVisible = false;
  bool _isReturn = true; // Track whether "Return" is selected
  List<String> _suggestedOrigins = [];
  List<String> _suggestedDestinations = [];
  String selectedOriginIataCode = ''; // A kiválasztott origin IATA kódja
  String selectedDestinationIataCode = ''; // A kiválasztott destination IATA kódja
  String fromIataCode = '';
  String toIataCode = '';


Future<List<Map<String, String>>> fetchSuggestions(String query) async {
  final String apiUrl = 'https://api.api-ninjas.com/v1/airports?name=$query';
  final String apiKey = 'Bxk9pwlTGxnFFKo4aCAoyw==62aNscelkTBSAh8b'; // Saját API kulcs

  try {
    final response = await http.get(
      Uri.parse(apiUrl),
      headers: {'X-Api-Key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data is List) {
        return data.map<Map<String, String>>((item) {
          final name = item['name'];
          final iataCode = item['iata'];
          if (name != null && iataCode != null) {
            return {
              'name': name as String,      // Reptér neve
              'iataCode': iataCode as String, // IATA kód
            };
          } else {
            return {'name': '', 'iataCode': ''}; // Ha valami hiányzik
          }
        }).toList();
      } else {
        print('Unexpected data format: $data');
      }
    } else {
      print('Request failed with status(Suggestions): ${response.statusCode}, ${response.body}');
    }
  } catch (e) {
    print('Error fetching suggestions: $e');
  }
  return [];
}


Future<Map<String, dynamic>> fetchAirportData(String query) async {
  final String apiUrl = 'https://api.api-ninjas.com/v1/airports?name=$query';
  final String apiKey = 'Bxk9pwlTGxnFFKo4aCAoyw==62aNscelkTBSAh8b';

  try {
    final response = await http.get(
      Uri.parse(apiUrl),
      headers: {'X-Api-Key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      if (data is List && data.isNotEmpty) {
        final airport = data[0];
        final iataCode = airport['iata'];
        final geoCode = airport['geoCode'];
        return {'iataCode': iataCode, 'geoCode': geoCode};
      } else {
        print('No airport data found');
      }
    } else {
      print('Request failed with status(AirportData): ${response.statusCode}');
    }
  } catch (e) {
    print('Error fetching airport data: $e');
  }
  return {};
}

Future<List<dynamic>> fetchHotelsByCity(String iataCode) async {
  final String amadeusApiUrl =
      'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=$iataCode';
  final String amadeusApiKey = 'Qp7J3CVC9iA7Ew6HoL0cNtjQYfNt'; // Cseréld ki a saját kulcsodra

  try {
    final response = await http.get(
      Uri.parse(amadeusApiUrl),
      headers: {'Authorization': 'Bearer $amadeusApiKey'},
    );

    if (response.statusCode == 200) {
      final hotelData = jsonDecode(response.body);
      if (hotelData['data'] != null && hotelData['data'].isNotEmpty) {
        return hotelData['data']; // Visszaadjuk a hotelek adatát
      } else {
        return []; // Ha nincs találat, üres listát adunk vissza
      }
    } else {
      print('Request failed with status(HotelsByCity-Main): ${response.statusCode}');
      return [];
    }
  } catch (e) {
    print('Error fetching hotel data: $e');
    return [];
  }
}



Future<void> _onDestinationSelected(String destinationName) async {
  // Fetch airport data az IATA kód alapján
  final airportData = await fetchAirportData(destinationName);

  if (airportData.isNotEmpty) {
    final iataCode = airportData['iataCode'];
    print('Selected IATA Code: $iataCode');

    // A kiválasztott IATA kód alapján kérdezzük le a szállodákat
    await fetchHotelsByCity(iataCode);
  } else {
    print('No airport data found for the selected destination.');
  }
}

Future<void> _searchFlights() async {
  if (_fromController.text.isEmpty || _toController.text.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Please select both origin and destination')),
    );
    return;
  }

  final origin = selectedOriginIataCode;
  final destination = selectedDestinationIataCode;
  final dateOfDeparture = _departureDate.toLocal().toIso8601String().split('T')[0];
  final returnDate = _isReturn && _returnDate != null
      ? _returnDate!.toLocal().toIso8601String().split('T')[0]
      : null;

  String url = 'http://localhost:3000/flight-search?originCode=$origin&destinationCode=$destination&dateOfDeparture=$dateOfDeparture';
  if (returnDate != null) {
    url += '&dateOfReturn=$returnDate';
  }

  try {
    final response = await http.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final flightData = jsonDecode(response.body);

      if (flightData.isNotEmpty) {
        // Lekérjük a hoteleket
        final firstFlight = flightData[0];
        final destinationIataCode = firstFlight['itineraries'][0]['segments'][1]['arrival']['iataCode'];
        final hotelResults = await fetchHotelsByCity(destinationIataCode);

        // Navigálás a FlightResultsPage oldalra, átadva a járatokat és a hoteleket
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => FlightResultsPage(
              flightResults: flightData,
              hotelResults: hotelResults, // Hotelek átadása
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No flights found for the selected date')),
        );
      }
    } else {
      throw Exception('Error fetching flights: ${response.statusCode}');
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to fetch flights: $e')),
    );
  }
}



// Általános Autocomplete mező létrehozása
Widget buildAutocompleteField(
  String label,
  TextEditingController controller,
  Function(String) onSelectedIataCode,
  Function(String) onSelectedIataCodeUpdated, // Módosított callback
) {
  return Autocomplete<String>(
    optionsBuilder: (TextEditingValue textEditingValue) async {
      if (textEditingValue.text.isEmpty) {
        return const Iterable<String>.empty();
      }
      final suggestions = await fetchSuggestions(textEditingValue.text);
      return suggestions.map((item) => item['name']!);
    },
    onSelected: (String selection) async {
      final suggestions = await fetchSuggestions(selection);
      final selected = suggestions.firstWhere(
        (item) => item['name'] == selection,
        orElse: () => {'name': '', 'iataCode': ''},
      );
      if (selected['iataCode']!.isNotEmpty) {
        onSelectedIataCodeUpdated(selected['iataCode']!); // IATA kód frissítése
        controller.text = selected['name']!; // Frissíti a text field szövegét
        _onDestinationSelected(selected['name']!);
      }
    },
    fieldViewBuilder: (context, fieldTextEditingController, focusNode, onFieldSubmitted) {
      return TextField(
        controller: fieldTextEditingController,
        focusNode: focusNode,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(),
        ),
      );
    },
    optionsViewBuilder: (context, onSelected, options) {
      final itemCount = options.length;
      final maxItems = 5;
      final itemHeight = 48.0;

      return Align(
        alignment: Alignment.topLeft,
        child: Material(
          elevation: 4.0,
          child: Container(
            width: 300,
            constraints: BoxConstraints(
              maxHeight: itemHeight * (itemCount < maxItems ? itemCount : maxItems),
            ),
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: itemCount,
              itemBuilder: (BuildContext context, int index) {
                final option = options.elementAt(index);
                return InkWell(
                  onTap: () => onSelected(option),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Text(option),
                  ),
                );
              },
            ),
          ),
        ),
      );
    },
  );
}




Future<void> _selectDate(BuildContext context, bool isDeparture) async {
  final DateTime? picked = await showDatePicker(
    context: context,
    initialDate: isDeparture ? _departureDate : (_returnDate ?? DateTime.now()),
    firstDate: DateTime.now(),
    lastDate: DateTime(2025, 12, 31),  // Ensure lastDate is after firstDate
    builder: (BuildContext context, Widget? child) {
      return Theme(
        data: ThemeData.dark().copyWith(
          primaryColor: Colors.deepPurple,
          colorScheme: ColorScheme.dark(primary: Colors.deepPurple, secondary: Colors.deepPurpleAccent),
          buttonTheme: ButtonThemeData(textTheme: ButtonTextTheme.primary),
        ),
        child: child!,
      );
    },
  );
  if (picked != null && picked != (isDeparture ? _departureDate : _returnDate)) {
    setState(() {
      if (isDeparture) {
        _departureDate = picked;
      } else {
        _returnDate = picked;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Selected Date: ${picked.toLocal().toString().split(' ')[0]}',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: Colors.green,
      ),
    );
  }
}
@override
Widget build(BuildContext context) {
  return Scaffold(
    extendBodyBehindAppBar: true, // Allow body to extend behind the AppBar
    appBar: AppBar(
      backgroundColor: Colors.transparent, // Transparent background
      elevation: 0.0, // Remove the shadow/elevation
      toolbarOpacity: 0, // Make the toolbar content fully transparent
      bottomOpacity: 0, // Make the bottom content transparent (if any)
    ),
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
            width: 100,
            height: 100,
          ),
        ),


        Positioned(
          top: 16,
          right: 16,
          child: GestureDetector(
            onTap: () async {
              SharedPreferences prefs = await SharedPreferences.getInstance();
              bool isLoggedIn = prefs.getBool('isLoggedIn') ?? false;

              if (isLoggedIn) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ProfilePage()),
                );
              } else {
                // Navigálás a LoginPage-re, de azután rögtön frissítsd az isLoggedIn állapotot,
                // ha bejelentkezett a felhasználó.
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => Loginpage()),
                ).then((value) async {
                  // Ha a bejelentkezés sikeres volt, frissítsd az állapotot itt is.
                  prefs = await SharedPreferences.getInstance();
                  bool newIsLoggedIn = prefs.getBool('isLoggedIn') ?? false;
                  if (newIsLoggedIn) {
                    // Ha be van jelentkezve, navigálj a HomePage-re
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (context) => HomePage()),
                    );
                  }
                });
              }
            },


              child: CircleAvatar(
                radius: 30,
                backgroundColor: Colors.transparent,
                child: Icon(
                  Icons.account_circle,
                  size: 50,
                  color: Colors.black,
                ),
              ),
            ),
          ),
        
      
        // Centered content
        Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  // Header Text
                  Text(
                    'Discover how to get anywhere',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'BY PLANE, TRAIN, BUS, FERRY AND CAR',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 40),
                  // Search Form Container
                  Container(
                    width: 380,
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
                      children: [
                        // One-way or Return selection
                        Row(
                          children: [
                            Radio<bool>(
                              value: true,
                              groupValue: _isReturn,
                              onChanged: (value) {
                                setState(() {
                                  _isReturn = true;
                                  _returnDate = null;
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
                                  _returnDate = null;
                                });
                              },
                            ),
                            Text('One-way'),
                          ],
                        ),
                        SizedBox(height: 24),
                        // Origin input
                        buildAutocompleteField(
                          'Origin', // Label
                          _fromController, // Text field
                          (iataCode) => selectedOriginIataCode = iataCode, // Save IATA code
                          (iataCode) => selectedOriginIataCode = iataCode, // Update IATA code if needed
                        ),
                        SizedBox(height: 16),
                        // Destination input
                        buildAutocompleteField(
                          'Destination', // Label
                          _toController, // Text field
                          (iataCode) => selectedDestinationIataCode = iataCode, // Save IATA code
                          (iataCode) => selectedDestinationIataCode = iataCode, // Update IATA code if needed
                        ),
                        SizedBox(height: 16),
                        // Departure and Return date pickers
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => _selectDate(context, true), // Select departure date
                                child: InputDecorator(
                                  decoration: InputDecoration(
                                    labelText: 'Departure',
                                    border: OutlineInputBorder(),
                                  ),
                                  child: Text(
                                    "${_departureDate.toLocal()}".split(' ')[0], // Date formatting
                                  ),
                                ),
                              ),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: GestureDetector(
                                onTap: _isReturn ? () => _selectDate(context, false) : null, // Select return date
                                child: InputDecorator(
                                  decoration: InputDecoration(
                                    labelText: 'Return',
                                    border: OutlineInputBorder(),
                                  ),
                                  child: Text(
                                    _returnDate != null
                                        ? "${_returnDate!.toLocal()}".split(' ')[0] // If return date exists
                                        : 'Select date', // If no return date
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        // Passengers dropdown
                        buildPassengersDropdown(),
                        SizedBox(height: 24),
                        // Search button
                        ElevatedButton.icon(
                          onPressed: () {
                            // Ensure all fields are filled out
                            final origin = _fromController.text;
                            final destination = _toController.text;
                            final dateOfDeparture = _departureDate.toLocal().toIso8601String().split('T')[0];
                            final returnDate = _isReturn && _returnDate != null
                                ? _returnDate!.toLocal().toIso8601String().split('T')[0]
                                : null;

                            String url = 'http://localhost:3000/flight-search?originCode=$origin&destinationCode=$destination&dateOfDeparture=$dateOfDeparture';
                            
                            if (returnDate != null) {
                              url += '&dateOfReturn=$returnDate';
                            }

                            // Perform the search
                            _searchFlights();
                          },
                          icon: Icon(Icons.search),
                          label: Text(
                            'Search flights',
                            style: TextStyle(color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.pink,
                            padding: EdgeInsets.symmetric(vertical: 16),
                            minimumSize: Size(double.infinity, 48),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 50),
                  // Circular icons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildOptionIcon(
                        icon: Icons.flight,
                        color: Colors.teal,
                        label: '53,682 Flights',
                        subLabel: 'via 1,162 Airlines',
                      ),
                      _buildOptionIcon(
                        icon: Icons.directions_boat,
                        color: Colors.blue,
                        label: '13,273 Ferries',
                        subLabel: 'via 4,289 Operators',
                      ),
                      _buildOptionIcon(
                        icon: Icons.directions_bus,
                        color: Colors.orange,
                        label: '969,666 Bus Routes',
                        subLabel: 'via 79,538 Operators',
                      ),
                      _buildOptionIcon(
                        icon: Icons.train,
                        color: Colors.purple,
                        label: '198,965 Train Lines',
                        subLabel: 'via 6,002 Operators',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  );
}


Widget buildAutocompleteOptions(Iterable<String> options, AutocompleteOnSelected<String> onSelected) {
  // Csak az első 5 elemet jelenítjük meg
  final displayOptions = options.take(5).toList();

  return Material(
    elevation: 4.0,
    child: Container(
      width: 200, // Fix szélesség beállítása
      constraints: BoxConstraints(
        maxHeight: 36.0 * displayOptions.length, // Dinamikus magasság
      ),
      child: ListView.builder(
        padding: EdgeInsets.zero,
        itemCount: displayOptions.length,
        itemBuilder: (BuildContext context, int index) {
          final option = displayOptions[index];
          return InkWell(
            onTap: () => onSelected(option),
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(option),
            ),
          );
        },
      ),
    ),
  );
}

Widget buildPassengersDropdown() {
  return Column(
    children: [
      GestureDetector(
        onTap: () {
          setState(() {
            _isPassengersDropdownVisible = !_isPassengersDropdownVisible;
          });
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: 'Passengers',
            border: OutlineInputBorder(),
          ),
          child: Text('${_adults} adult, ${_children} children'),
        ),
      ),
      if (_isPassengersDropdownVisible)
        Column(
          children: [
            buildPassengerCounter('Adults', _adults, (newCount) => setState(() => _adults = newCount)),
            buildPassengerCounter('Children', _children, (newCount) => setState(() => _children = newCount)),
          ],
        ),
    ],
  );
}

Widget buildPassengerCounter(String label, int count, Function(int) onCountChanged) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label),
      Row(
        children: [
          IconButton(
            icon: Icon(Icons.remove),
            onPressed: count > 0 ? () => onCountChanged(count - 1) : null,
          ),
          Text('$count'),
          IconButton(
            icon: Icon(Icons.add),
            onPressed: () => onCountChanged(count + 1),
          ),
        ],
      ),
    ],
  );
}
  Widget _buildOptionIcon({
    required IconData icon,
    required Color color,
    required String label,
    required String subLabel,
  }) {
    return Container(
      width: 175, // Increased container width to fit icon and text
      height: 175, // Increased container height
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.75), // Semi-transparent white background
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
          Icon(icon, color: color, size: 75), // Adjusted icon size
          SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 15, // Adjusted font size to fit inside the circle
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            subLabel,
            style: TextStyle(
              fontSize: 13, // Adjusted sub-label font size
              color: Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}