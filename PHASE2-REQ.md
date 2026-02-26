# Phase 2 Requirements:

These are the additional requirements for this app now.. 
Currently the app has 'Purchase' module where the bills and payments are created against the vendor and the project.. 
Now we need to develop 'Sales' module where the bills and payments will be created against the customers..
we need to maintain the Sales bills and payments in separate tables as compared to the existing bills, payments table that is used by the purchase module.. 

Here is the customer list below.. can you create supabase script for creating this table and adding those values? Update the script in @MIGRATION-TO-REACT-NATIVE.md file.  

id,name,value
2,CUSTOMER_LIST,"NA,Sameera@Vengai 8 Acres,Sameera@Vengai Arch,Sameera@Vengai Approach Road,Pradhyum@Mamandur Office,Pradhyum@Mamandur 9 Acres,Sameera@Walaja CWall,Sameera@Mamandur NMR,Sameera@Vengai NMR,Sameera@Vedal NMR,Sameera@KPM NMR,Sameera@Malarippakkam,Kundathur Labour Payment,Vedal Labour Payment,T.Zisai Labour Payment,Sameera@Karai Pile Work,Vengai Labour Payment,Cgl Labour Payment,Sameera@Karai Kerb Work,Srinivas@Customer (Vengai 414),Koduvalli Labour Payment,Prabu@Customer (Vengai 166),Dhanalakshmi@Vengai 4E Part,Sameera@Vengai 4 Acres,Sameera@Karai PreCast Wall,Shyam@Karai 15,Sameera@Arcot PreCast Wall,Walaja Labour Payment,Lotus Labour Payment,Sameera@Labour Payment,Sameera@Vedal Wall Work,Sameera@Walaja Office Back CWall,Sameera@Walaja Arch,Sameera@Vengai Sports,Sameera@Vandranthangal,Sameera@Vegai CWall,NMR Adjustment,Sameera@Vrinjipuram,Sameera@Walaja Phase 2,Sameera@Vengai Park,Sameera@Vedal 1.35 Acres,Sameera@NMR Payment,Pradhyum@Mamandur Road Crossing,Sameera@Vengai 3.26 Acres,Sameera@Madura-Temp-Bridge"

similarly create below category details table for the sales module?.. maintain the category and subcategory as it is.. means the subcategory in comma separated format.. update the scripts in @MIGRATION-TO-REACT-NATIVE.md file.. 

id,category,subcategory
1,Materials Supply,"RA Bill 1,RA Bill 2,RA Bill 3,RA Bill 4,RA Bill 5"
2,Road Development,"RA Bill 1,RA Bill 2,RA Bill 3,RA Bill 4,RA Bill 5"
3,Park Development,"RA Bill 1,RA Bill 2,RA Bill 3,RA Bill 4,RA Bill 5"
4,Arch Development,"RA Bill 1,RA Bill 2,RA Bill 3,RA Bill 4,RA Bill 5"
5,Villa Construction,"RA Bill 1,RA Bill 2,RA Bill 3,RA Bill 4,RA Bill 5"

Also create a tab view with below tabs..  

- Home, Projects, Purchase, Sales, Reports

### Home tab 

For now its empty now.. 

### Projects Tab

- Lists all the projects
- Each project page lists bills from purchases
- And payment from sales
- Outstanding = sum of bills - payments

### Purchase Tab:

- Existing project list and other screens go here.. 

### Sales Tab

- Similar to purchase screens
- Lists all the projects. Project page shows customers list.
- Instead of Vendor, show Customers in bills and payments
- Show the Sales category only.

### Reports Tab

For now no content here.

Others tasks:

- Change the date format to “DD/MM/YYYY” everywhere