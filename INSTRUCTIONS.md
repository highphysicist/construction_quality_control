# Demo Instructions

## 1. Sign In

1. Open the app URL.
2. Click Sign In.
3. Choose Google sign-in.
4. After login, you should land in the project workspace.

## 2. Create a Test (Parent Ticket)

1. Open Backlog from the left sidebar.
2. Use the create area to add a new Test.
3. Enter the test name.
4. Set Required Test Instances (for example, 2 or 3).
5. Click Create Test.
6. Confirm a parent Test is created and child Test Instances are auto-generated.

## 3. Assign Test and Test Instances

1. Open the parent Test details.
2. Set assignee/reporter as needed.
3. Open a child Test Instance.
4. Assign it to yourself (or target tester).

## 4. Move Through Workflow Columns

1. Go to Board.
2. Move Test Instance from RFI to Testing.
3. Open the Test Instance card details.
4. In Soil Moisture Test Slip section, click Open Soil Moisture Slip Editor.

## 5. Fill Soil Moisture Slip Form

1. In the slip editor, fill:
   - Sample ID
   - Initial Weight (g)
   - Final Weight (g)
2. Review computed read-only values:
   - Moisture Loss
   - Moisture %
3. Fill inspector review fields as applicable:
   - L1 status and note
   - L2 status and note
4. Close the modal after values are saved.

## 6. Continue Column Movement

1. Move the instance to Inspection L1.
2. Complete L1 review fields if your role allows it.
3. Move to Inspection L2.
4. Complete L2 review fields if your role allows it.
5. Move to Done when allowed by workflow permissions.

## 7. Parent Test Completion Rule

1. Ensure all child Test Instances are Done.
2. Then move the parent Test to Done.
3. If any child is not Done, parent Done transition should be blocked.

## 8. Audit Completed Records in Retrospect

1. Open Retrospect from the sidebar.
2. Search by keywords such as:
   - Project key/name
   - Epic
   - Test/Test Instance key
   - Assignee/Reporter
   - done
3. Optional: enable Regex mode for patterns like `done|instance`.
4. Filter by type (All / Tests Only / Test Instances Only).
5. Review timestamped completed records in the table.
