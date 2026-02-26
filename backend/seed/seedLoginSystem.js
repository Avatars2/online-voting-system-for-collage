import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Department from '../models/Department.js';
import ClassModel from '../models/Class.js';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import Notice from '../models/Notice.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function seed(){
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Admin.deleteMany();
    await Student.deleteMany();
    await Department.deleteMany();
    await ClassModel.deleteMany();
    await Election.deleteMany();
    await Candidate.deleteMany();
    await Notice.deleteMany();

    // Create departments
    console.log('Creating departments...');
    const deptCS = await Department.create({ 
      name: 'Computer Science', 
      head: 'Dr. Alan Turing' 
    });
    const deptEng = await Department.create({ 
      name: 'Engineering', 
      head: 'Dr. Nikola Tesla' 
    });

    // Create classes
    console.log('Creating classes...');
    const cls2024A = await ClassModel.create({ 
      name: 'CS 2024 - A', 
      department: deptCS._id 
    });
    const cls2024B = await ClassModel.create({ 
      name: 'CS 2024 - B', 
      department: deptCS._id 
    });
    const eng2024 = await ClassModel.create({ 
      name: 'ENG 2024', 
      department: deptEng._id 
    });

    // Create Admin Users (password hashing is automatic via pre-save middleware)
    console.log('Creating admin users...');
    const admin1 = await Admin.create({
      name: 'Dr. John Wilson',
      email: 'admin@college.edu',
      specialId: 'ADMIN001',
      password: 'admin123',  // Will be auto-hashed
      role: 'admin'
    });

    const admin2 = await Admin.create({
      name: 'Ms. Sarah Johnson',
      email: 'admin2@college.edu',
      specialId: 'ADMIN002',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✅ Admin users created:');
    console.log('   - Email:', admin1.email, '| Special ID: ADMIN001 | Password: admin123');
    console.log('   - Email:', admin2.email, '| Special ID: ADMIN002 | Password: admin123');

    // Create Student Users
    console.log('\nCreating student users...');
    const student1 = await Student.create({
      name: 'Alice Kumar',
      email: 'alice@college.edu',
      studentId: 'CS2024001',
      specialId: 'STU001',
      password: 'student123',  // Will be auto-hashed
      department: deptCS._id,
      class: cls2024A._id,
      role: 'student'
    });

    const student2 = await Student.create({
      name: 'Bob Martinez',
      email: 'bob@college.edu',
      studentId: 'CS2024002',
      specialId: 'STU002',
      password: 'student123',
      department: deptCS._id,
      class: cls2024B._id,
      role: 'student'
    });

    const student3 = await Student.create({
      name: 'Charlie Brown',
      email: 'charlie@college.edu',
      studentId: 'ENG2024001',
      specialId: 'STU003',
      password: 'student123',
      department: deptEng._id,
      class: eng2024._id,
      role: 'student'
    });

    console.log('✅ Student users created:');
    console.log('   - Name:', student1.name, '| Special ID: STU001 | Password: student123');
    console.log('   - Name:', student2.name, '| Special ID: STU002 | Password: student123');
    console.log('   - Name:', student3.name, '| Special ID: STU003 | Password: student123');

    // Create Election
    console.log('\nCreating elections...');
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days from now

    const election = await Election.create({
      title: 'Student Council Elections 2024',
      description: 'Annual elections for student council positions',
      startDate,
      endDate
    });

    // Create Candidates
    console.log('Creating candidates...');
    const candidate1 = await Candidate.create({
      election: election._id,
      name: 'Alice Kumar',
      position: 'President',
      description: 'Experienced student leader'
    });

    const candidate2 = await Candidate.create({
      election: election._id,
      name: 'Charlie Brown',
      position: 'Vice President',
      description: 'Dedicated to student welfare'
    });

    console.log('✅ Candidates created:');
    console.log('   - Alice Kumar (President)');
    console.log('   - Charlie Brown (Vice President)');

    // Create Notices
    console.log('\nCreating notices...');
    await Notice.create({
      title: 'Welcome to Online Voting System',
      body: 'Welcome to our secure online voting platform. Please read the guidelines before participating in elections.',
      audience: 'all'
    });

    await Notice.create({
      title: 'Voting Guidelines',
      body: 'Each student can vote only once. Ensure you vote with verified credentials.',
      audience: 'student'
    });

    console.log('✅ Notices created');

    console.log('\n' + '='.repeat(60));
    console.log('SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 TEST CREDENTIALS:');
    console.log('\nADMIN LOGIN:');
    console.log('  Special ID: ADMIN001');
    console.log('  Password: admin123');
    console.log('\nSTUDENT LOGIN:');
    console.log('  Special ID: STU001');
    console.log('  Password: student123');
    console.log('\n✅ You can now login at http://localhost:5173 (or your frontend URL)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
