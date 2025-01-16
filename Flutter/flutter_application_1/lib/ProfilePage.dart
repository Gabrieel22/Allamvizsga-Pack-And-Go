import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ImagePicker _picker = ImagePicker();
  File? _image;
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  
  String? _username;
  String? _email;

  @override
  void initState() {
    super.initState();
    _loadUserDetails();
  }

void _loadUserDetails() async {
  try {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    setState(() {
      _username = prefs.getString('username') ?? "Guest";
      _email = prefs.getString('email') ?? "example@example.com";
      _emailController.text = _email!;
    });
  } catch (e) {
    print("Error loading user details: $e");
    // Optionally show an error message to the user
  }
}

  Future<void> _updateProfilePicture() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
      // Feltöltés az API-n keresztül (ez csak egy példa, valós API-t kell használni)
      final response = await http.post(
        Uri.parse('http://localhost:3000/update-profile-picture'),
        headers: {'Content-Type': 'multipart/form-data'},
        body: {'profilePicture': _image!.path},
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Profile picture updated!')));
      }
    }
  }

Future<void> _updateEmail() async {
  // Email validation before API call
  if (!isValidEmail(_emailController.text)) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Please enter a valid email address.')),
    );
    return;
  }

  try {
    final response = await http.post(
      Uri.parse('http://localhost:3000/update-email'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'newEmail': _emailController.text}),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = json.decode(response.body);
      if (data['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Email updated successfully!')),
        );
        SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setString('email', _emailController.text);
        setState(() {
          _email = _emailController.text;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Email update failed.')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update email. Please try again later.')),
      );
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('An error occurred: $e')),
    );
  }
}

bool isValidEmail(String email) {
  return RegExp(r'^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)*(\.[a-zA-Z]{2,})$').hasMatch(email);
}

  Future<void> _updatePassword() async {
    final response = await http.post(
      Uri.parse('http://localhost:3000/update-password'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'currentPassword': _currentPasswordController.text,
        'newPassword': _newPasswordController.text,
      }),
    );
    if (response.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Password updated!')));
      _currentPasswordController.clear();
      _newPasswordController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update password')));
    }
  }

@override
Widget build(BuildContext context) {
  return FutureBuilder(
    future: SharedPreferences.getInstance(),
    builder: (context, snapshot) {
      if (!snapshot.hasData) {
        return Scaffold(body: Center(child: CircularProgressIndicator()));
      }

      final prefs = snapshot.data as SharedPreferences;
      bool isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
      String? username = prefs.getString('username'); // Felhasználónév mentése

      if (!isLoggedIn) {
        Future.microtask(() {
          Navigator.pushReplacementNamed(context, '/login');
        });
        return Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }

      return Scaffold(
        extendBodyBehindAppBar: true, // AppBar mögötti tartalom engedélyezése
        body: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                image: DecorationImage(
                  image: AssetImage("assets/pictures/background.jpg"),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Positioned(
              top: 50, // A tartalom pozíciójának beállítása
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  '', // Username megjelenítése
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    shadows: [
                      Shadow(
                        offset: Offset(0, 2),
                        blurRadius: 4,
                        color: Colors.black54,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Center(
              child: Container(
                width: 350,
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 10,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: _updateProfilePicture,
                        child: CircleAvatar(
                          radius: 50,
                          backgroundImage: _image != null
                              ? FileImage(_image!)
                              : AssetImage('assets/pictures/default_avatar.jpg')
                                  as ImageProvider,
                        ),
                      ),
                      SizedBox(height: 20),
                      Text(
                        _username ?? "",
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 10),
                      TextField(
                        controller: _emailController,
                        decoration: InputDecoration(labelText: 'Email'),
                      ),
                      ElevatedButton(
                        onPressed: _updateEmail,
                        child: Text('Update Email'),
                      ),
                      SizedBox(height: 10),
                      TextField(
                        controller: _currentPasswordController,
                        obscureText: true,
                        decoration: InputDecoration(labelText: 'Current Password'),
                      ),
                      TextField(
                        controller: _newPasswordController,
                        obscureText: true,
                        decoration: InputDecoration(labelText: 'New Password'),
                      ),
                      ElevatedButton(
                        onPressed: _updatePassword,
                        child: Text('Update Password'),
                      ),
                      SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () {
                          _logout(context);
                        },
                        child: Text('Logout'),
                      ),
                    ],
                  ),
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
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey.withOpacity(0.8),
                ),
                child: Text('Back to Homepage', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      );
    },
  );
}

  void _logout(BuildContext context) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', false);
    Navigator.pushReplacementNamed(context, '/login');
  }
}