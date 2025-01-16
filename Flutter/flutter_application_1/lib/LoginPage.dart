import 'package:flutter/material.dart';
import 'package:flutter_application_1/ProfilePage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'RegistrationPage.dart';
import 'main.dart';

class Loginpage extends StatelessWidget {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  final String apiUrl = 'http://localhost:3000/login'; // API URL

Future<void> loginUser(BuildContext context) async {
  print('Login user function started');

  final String username = _usernameController.text;
  final String password = _passwordController.text;

  print('username: $username, password: $password');

  if (username.isNotEmpty && password.isNotEmpty) {
    try {
      print('Attempting to send HTTP request');
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'username': username, 'password': password}),
      );

      print('HTTP response received: ${response.statusCode}');

      if (response.statusCode == 200) {
        print('Login successful, showing snackbar');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login successful!')),
        );

        print('Saving login state and user details');
        SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setBool('isLoggedIn', true);
        await prefs.setString('username', username);
        
        // Tegyük fel, hogy az email-t is visszakapod a szervertől
        // Ha nem, akkor vagy ne mentsd el, vagy kérd le másképp
        final Map<String, dynamic> data = json.decode(response.body);
        String? email = data['email']; // feltéve, hogy a szerver visszaküldi az emailt
        if (email != null) {
          await prefs.setString('email', email);
        }

        print('Attempting navigation');
        try {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => HomePage()),
          );
          print('Navigation attempted');
        } catch (e) {
          print('Navigation error: $e');
        }
      } else {
        print('Login failed, showing error');
        final errorData = json.decode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorData['message'] ?? 'Login failed!')),
        );
      }
    } catch (e) {
      print('Caught error in login process: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  } else {
    print('Credentials are empty');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Please enter your credentials.')),
    );
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
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
          // Back to Homepage button
          Positioned(
            top: 16,
            right: 16,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Vissza a kezdőoldalra
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey.withOpacity(0.8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'Back to Homepage',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ),
          // Centered login container
          Center(
            child: Container(
              width: 350,
              padding: const EdgeInsets.all(24.0),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.5), // 50% átlátszó fehér
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Login header
                  Text(
                    'Login',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                  SizedBox(height: 16),
                  // Username Input
                  TextField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                  SizedBox(height: 16),
                  // Password Input
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                  SizedBox(height: 24),
                  // Login Button (Yellow)
                ElevatedButton(
                  onPressed: () {
                    print('Login button pressed');
                    loginUser(context);
                  },
                  
                    style: ElevatedButton.styleFrom(
                      minimumSize: Size(double.infinity, 50),
                      backgroundColor: Colors.yellow[700], // Sárga gomb
                    ),
                    child: Text(
                      'Login',
                      style: TextStyle(fontSize: 18, color: Colors.black),
                    ),
                  ),
                  SizedBox(height: 16),
                  // Registration Button (Blue)
                  ElevatedButton(
                    onPressed: () {
                      // Navigálás a regisztrációs oldalra
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => RegistrationPage()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      minimumSize: Size(double.infinity, 50),
                      backgroundColor: Colors.blue, // Kék gomb
                    ),
                    child: Text(
                      'Create New Account',
                      style: TextStyle(fontSize: 18, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
