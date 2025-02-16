import 'package:flutter/material.dart';
import 'package:flutter_application_1/LoginPage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'FlightDetailPage.dart';
import 'dart:math';
import 'ProfilePage.dart';


class FlightResultsPage extends StatefulWidget {
  final List<dynamic> flightResults;
  final List<dynamic> hotelResults;

  const FlightResultsPage({
    Key? key,
    required this.flightResults,
    required this.hotelResults,
  }) : super(key: key);

  @override
  _FlightResultsPageState createState() => _FlightResultsPageState();
}

class _FlightResultsPageState extends State<FlightResultsPage> {
  List<dynamic> hotelResults = [];
  List<dynamic> activities = [];

  @override
  void initState() {
    super.initState();

    // Fetch data after layout is completed
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.flightResults.isNotEmpty) {
        final firstFlight = widget.flightResults[0];
        final destinationIataCode =
            firstFlight['itineraries'][0]['segments'][1]['arrival']['iataCode'];
        fetchHotelsByCity(destinationIataCode);
      }

      if (widget.hotelResults.isNotEmpty) {
        // If there are hotels, fetch activities based on the first hotel's location
        final firstHotel = widget.hotelResults[0];
        final latitude = firstHotel['geoCode']['latitude'];
        final longitude = firstHotel['geoCode']['longitude'];
        fetchActivitiesByLocation(latitude, longitude);
      }
    });
  }

  Future<void> fetchHotelsByCity(String iataCode) async {
    final String amadeusApiUrl =
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=$iataCode';
    final String amadeusApiKey = 'Qp7J3CVC9iA7Ew6HoL0cNtjQYfNt';

    try {
      final response = await http.get(
        Uri.parse(amadeusApiUrl),
        headers: {'Authorization': 'Bearer $amadeusApiKey'},
      );

      if (response.statusCode == 200) {
        final hotelData = jsonDecode(response.body);
        setState(() {
          hotelResults = hotelData['data'] ?? [];
        });
      } else {
        print('Request failed with status(Hotel): ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching hotel data: $e');
    }
  }

Future<void> fetchActivitiesByLocation(double latitude, double longitude) async {
  final String amadeusApiUrl =
      'https://test.api.amadeus.com/v1/shopping/activities?latitude=$latitude&longitude=$longitude';
  final String accessToken = 'Qp7J3CVC9iA7Ew6HoL0cNtjQYfNt'; // Your access token

  try {
    final response = await http.get(
      Uri.parse(amadeusApiUrl),
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode == 200) {
      final activityData = jsonDecode(response.body);
      setState(() {
        activities = activityData['data'] ?? [];
      });
    } else {
      print('Request failed with status(Activity): ${response.statusCode}');
      print('Response body: ${response.body}');
    }
  } catch (e) {
    print('Error fetching activities: $e');
  }
}




@override
Widget build(BuildContext context) {
  return Scaffold(
    appBar: _buildAppBar(), // Itt hívjuk meg a megadott AppBar-t
    body: Stack(
      children: <Widget>[
        _buildBackgroundImage(), // Háttérkép
        _buildContentLayout(), // Fő tartalom
      ],
    ),
  );
}

  PreferredSizeWidget _buildAppBar() => AppBar(
        title: Text('Flight Results', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.deepPurple,
        centerTitle: true,
      );


  Widget _buildBackgroundImage() {
    return Container(
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage("assets/pictures/background.jpg"),
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildContentLayout() {
    return Column(
      children: [
        Flexible(
          flex: 2,
          child: Row(
            children: [
              Flexible(child: _buildFlightResults()),
              Flexible(child: _buildHotelResults()),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildReservedSpace(),
      ],
    );
  }

Widget _buildFlightResults() {
  return Container(
    padding: const EdgeInsets.all(8.0),
    child: Column(
      children: [
        // "FLIGHTS" felirat középre igazítva
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Text(
            'FLIGHTS',
            textAlign: TextAlign.center,  // A szöveget középre igazítjuk
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.bold,
              color: Colors.white,  // Fehér szín
            ),
          ),
        ),
        // Flight lista megjelenítése
        widget.flightResults.isNotEmpty
            ? Expanded(
                child: ListView.builder(
                  itemCount: widget.flightResults.length < 10
                      ? widget.flightResults.length
                      : 10,
                  itemBuilder: (context, index) {
                    final flight = widget.flightResults[index];
                    final itinerary = flight['itineraries'][0];

                    if (itinerary['segments'].length >= 2) {
                      final departure = itinerary['segments'][0]['departure'];
                      final arrival = itinerary['segments'][1]['arrival'];
                      final price = flight['price'];

                      return _buildFlightCard(flight, departure, arrival, price);
                    } else {
                      return const SizedBox();
                    }
                  },
                ),
              )
            : const Center(
                child: Text(
                  'No results found.',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
      ],
    ),
  );
}

  Widget _buildFlightCard(dynamic flight, dynamic departure, dynamic arrival, dynamic price) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        color: Colors.white.withOpacity(0.8),
        elevation: 4.0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(15),
        ),
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => FlightDetailPage(flight: flight),
              ),
            );
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Flight ${flight['validatingAirlineCodes'][0]} - ${flight['id']}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'From: ${departure['iataCode']} (${departure['at']})',
                  style: const TextStyle(fontSize: 14, color: Colors.black),
                ),
                Text(
                  'To: ${arrival['iataCode']} (${arrival['at']})',
                  style: const TextStyle(fontSize: 14, color: Colors.black),
                ),
                const SizedBox(height: 12),
                Text(
                  '${price['currency']} ${price['grandTotal']}',
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }


Widget _buildHotelResults() {
  return Container(
    padding: const EdgeInsets.all(8.0),
    child: Column(
      children: [
        // "HOTELS" felirat középre igazítva
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Text(
            'HOTELS',
            textAlign: TextAlign.center, // A szöveget középre igazítjuk
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.bold,
              color: Colors.white, // Fehér szín
            ),
          ),
        ),
        // Hotel lista megjelenítése
        hotelResults.isNotEmpty
            ? Expanded(
                child: ListView.builder(
                  itemCount: hotelResults.length,
                  itemBuilder: (context, index) {
                    final hotel = hotelResults[index];
                    return _buildHotelCard(hotel);
                  },
                ),
              )
            : const Center(
                child: Text(
                  'No hotels found.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
      ],
    ),
  );
}

Widget _buildHotelCard(dynamic hotel) {
  final name = hotel['name'] ?? 'N/A';
  final chainCode = hotel['chainCode'] ?? 'N/A';
  final countryCode = hotel['address']['countryCode'] ?? 'N/A';
  final latitude = hotel['geoCode']['latitude']?.toString() ?? 'N/A';
  final longitude = hotel['geoCode']['longitude']?.toString() ?? 'N/A';
  final random = Random();
  final stars = random.nextInt(5) + 1; // Generál egy véletlenszerű csillagszámot (1 és 5 között).
  final price = 20 + (stars - 1) * 7.5 +150; // Ár csillagszám alapján: 20 + (csillagszám-1)*7.5

  return Container(
    margin: const EdgeInsets.symmetric(vertical: 8),
    child: Card(
      color: Colors.white.withOpacity(0.8),
      elevation: 4.0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(15),
      ),
      child: InkWell(
        onTap: () {},
        child: Container(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.black,
                ),
              ),
              Text('Chain: $chainCode'),
              Text('Country: $countryCode'),
              Row(
                children: [
                  Text('Latitude: $latitude'),
                  const SizedBox(width: 10),
                  Text('Longitude: $longitude'),
                ],
              ),
              Row(
                children: [
                  Text('Stars: ${'\u2605' * stars}', // Unicode karakter a csillagokhoz.
                      style: const TextStyle(fontSize: 16, color: Colors.amber)),
                  const Spacer(),
                  Text('\$${price.toStringAsFixed(2)}/night',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}


Widget _buildReservedSpace() {
  return Container(
    height: 350,
    color: Colors.transparent,
    alignment: Alignment.center,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,  // Középre igazítás
      crossAxisAlignment: CrossAxisAlignment.center,  // Középre igazítás
      children: [
        // Felirat a lista felett
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Text(
            'ACTIVITIES AT THE DESTINATION',
            textAlign: TextAlign.center, 
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        // Lista megjelenítése
        activities.isNotEmpty
            ? Expanded(
                child: ListView.builder(
                  itemCount: activities.length,
                  itemBuilder: (context, index) {
                    final activity = activities[index];
                    // Véletlenszerű ár generálása 2 és 25 között
                    final random = Random();
                    final randomPrice = random.nextInt(24) + 2; // 2-től 25-ig terjedő értékek

                    return Card(
                      elevation: 4.0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      margin: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 16.0),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Kép bal oldalon
                            Image.network(
                              activity['pictures'].isNotEmpty
                                  ? activity['pictures'][0]
                                  : 'https://via.placeholder.com/150',
                              width: 100,
                              height: 100,
                              fit: BoxFit.cover,
                            ),
                            const SizedBox(width: 16), // Kép és szöveg közötti távolság
                            // Szöveg jobb oldalon
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    activity['name'] ?? 'No name',  // Név
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 4), // Kis távolság a cím és a leírás között
                                  Text(
                                    'Price: €$randomPrice',  // Véletlenszerű ár
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Location: ${activity['geoCode']['latitude']}, ${activity['geoCode']['longitude']}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    activity['description'] ?? 'No description available',  // Leírás
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              )
            : const Text(
                'No activities found.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ],
    ),
  );
}
}