/**
 * End-to-end check of the shadow-teacher request flow against the real
 * database, without needing the web app open:
 *
 *   admin requests a teacher for an admitted student
 *   -> branch principal sends it to the teacher
 *   -> teacher accepts
 *   -> teacher is assigned to the student automatically
 *
 * plus the cancel path (principal cancels) and the duplicate guards.
 *
 * It creates its own throwaway admin / principal / teacher / students
 * (names start with "ZZTEST"), calls the same controller functions the API
 * routes use, and deletes everything it created at the end — even if a
 * step fails. Your real data isn't touched.
 *
 * Usage (from the backend/ folder):
 *   node scripts/testTeacherRequestFlow.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Student, { BRANCHES } from "../models/Student.js";
import Message from "../models/Message.js";
import TeacherAssignmentRequest from "../models/TeacherAssignmentRequest.js";
import {
  createTeacherAssignmentRequest,
  cancelTeacherAssignmentRequest,
  cancelTeacherAssignmentRequestAsPrincipal,
  reviewTeacherAssignmentRequest,
  respondToAssignmentRequest,
  listMyAssignmentRequestsAsTeacher,
} from "../controllers/teacherAssignmentRequestController.js";

dotenv.config();

const TAG = `ZZTEST${Date.now().toString().slice(-6)}`;
const BRANCH = BRANCHES[0];
let failures = 0;

// Minimal stand-in for Express's res object.
const call = async (handler, req) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handler({ params: {}, body: {}, query: {}, ...req }, res);
  return res;
};

const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
};

const makeUser = (role, extra = {}) =>
  User.create({
    username: `${TAG.toLowerCase()}_${role}`,
    password: "not-a-real-password",
    role,
    name: `${TAG} ${role}`,
    ...extra,
  });

const makeStudent = (n) =>
  Student.create({
    branch: BRANCH,
    admissionNumber: `${TAG}-${n}`,
    fullName: `${TAG} Student ${n}`,
    dateOfBirth: new Date("2018-01-01"),
    gender: "male",
    programCategory: "national",
    grade: "Grade 6",
    diagnosis: "ASD",
    parentFirstName: `${TAG} Parent`,
    parentEmail: `${TAG.toLowerCase()}${n}@example.com`,
    parentPhone: "+94 770000000",
  });

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Test data tag: ${TAG} (branch: ${BRANCH})\n`);

  const admin = await makeUser("admin");
  const principal = await makeUser("principal", { branch: BRANCH });
  const teacher = await makeUser("shadow_teacher");
  const teacher2 = await makeUser("shadow_teacher", {
    username: `${TAG.toLowerCase()}_teacher2`,
    name: `${TAG} teacher2`,
  });
  const student1 = await makeStudent(1);
  const student2 = await makeStudent(2);

  const asAdmin = { id: admin._id.toString(), role: "admin" };
  const asPrincipal = { id: principal._id.toString(), role: "principal", branch: BRANCH };
  const asTeacher = { id: teacher._id.toString(), role: "shadow_teacher" };

  try {
    console.log("Happy path: request -> principal sends -> teacher accepts");

    let res = await call(createTeacherAssignmentRequest, {
      params: { id: teacher._id.toString() },
      body: { studentId: student1._id.toString() },
      user: asAdmin,
    });
    check("admin can request a teacher for an admitted student", res.statusCode === 201, JSON.stringify(res.body));
    const requestId = res.body?.request?._id?.toString();
    check("request is waiting for the principal", res.body?.request?.status === "pending");
    check("request carries the student's details", res.body?.request?.studentName === student1.fullName);

    res = await call(createTeacherAssignmentRequest, {
      params: { id: teacher2._id.toString() },
      body: { studentId: student1._id.toString() },
      user: asAdmin,
    });
    check("a second teacher can't be requested for the same child", res.statusCode === 409, JSON.stringify(res.body));

    res = await call(reviewTeacherAssignmentRequest, {
      params: { id: requestId },
      body: { action: "forward", message: "Can you take this child on?" },
      user: asPrincipal,
    });
    check("principal sends the request to the teacher", res.body?.request?.status === "forwarded", JSON.stringify(res.body));

    res = await call(listMyAssignmentRequestsAsTeacher, { user: asTeacher });
    check(
      "teacher sees it in their Assignment Requests",
      (res.body?.requests || []).some((r) => r._id.toString() === requestId)
    );

    const inbox = await Message.findOne({ recipient: teacher._id, category: "Teacher Assignment" });
    check("teacher got the principal's message in their inbox", !!inbox);
    check("the message names the student and condition", !!inbox?.body.includes(student1.fullName) && !!inbox?.body.includes("ASD"));

    res = await call(respondToAssignmentRequest, {
      params: { id: requestId },
      body: { action: "accept" },
      user: asTeacher,
    });
    check("teacher can accept (no Server Error)", res.statusCode === 200, JSON.stringify(res.body));
    check("request is marked fulfilled", res.body?.request?.status === "fulfilled");

    const updated = await Student.findById(student1._id);
    check(
      "teacher was assigned to the student automatically",
      updated.assignedTeacher?.toString() === teacher._id.toString() && updated.status === "assigned"
    );
    check(
      "the placement is recorded in the student's teacher history",
      updated.teacherHistory.some((h) => h.teacher.toString() === teacher._id.toString() && !h.removedAt)
    );

    console.log("\nCancel path: request -> principal cancels");

    res = await call(createTeacherAssignmentRequest, {
      params: { id: teacher2._id.toString() },
      body: { studentId: student2._id.toString() },
      user: asAdmin,
    });
    const request2Id = res.body?.request?._id?.toString();
    check("admin requests another teacher for a second child", res.statusCode === 201, JSON.stringify(res.body));

    res = await call(cancelTeacherAssignmentRequestAsPrincipal, {
      params: { id: request2Id },
      body: { reason: "Test cancel" },
      user: asPrincipal,
    });
    check("principal can cancel the request", res.body?.request?.status === "cancelled", JSON.stringify(res.body));

    res = await call(cancelTeacherAssignmentRequest, {
      params: { id: request2Id },
      user: asAdmin,
    });
    check("a cancelled request can't be cancelled again", res.statusCode === 400);

    res = await call(createTeacherAssignmentRequest, {
      params: { id: teacher2._id.toString() },
      body: { studentId: student2._id.toString() },
      user: asAdmin,
    });
    check("after cancelling, the teacher can be requested again", res.statusCode === 201, JSON.stringify(res.body));
    const request3Id = res.body?.request?._id?.toString();

    res = await call(cancelTeacherAssignmentRequest, {
      params: { id: request3Id },
      user: asAdmin,
    });
    check("admin can cancel a request too", res.body?.request?.status === "cancelled", JSON.stringify(res.body));
  } finally {
    // Clean up everything this run created.
    const userIds = [admin, principal, teacher, teacher2].map((u) => u._id);
    await TeacherAssignmentRequest.deleteMany({ teacher: { $in: userIds } });
    await Message.deleteMany({ $or: [{ sender: { $in: userIds } }, { recipient: { $in: userIds } }] });
    await Student.deleteMany({ _id: { $in: [student1._id, student2._id] } });
    await User.deleteMany({ _id: { $in: userIds } });
    console.log("\nTest data removed.");
    await mongoose.disconnect();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
