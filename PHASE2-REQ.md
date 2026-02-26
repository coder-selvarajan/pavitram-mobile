# Phase 2 Requirements:

These are additional requirements for this app now.. 
Currently the app has 'Purchase' module where the bills and payments are created against the vendor and the project.. 
Now we need to develop 'Sales' module where the bills and payments will be created against the customers.. use 'bills_sales, payments_sales' tables for this... 


Also create a tab view with below tabs..  

## Tabs:

- Home, Projects, Purchase, Sales, Reports

### Home tab 

For now there is not content here.. 

### Projects Tab

- Lists all the projects
- Each project page lists bills from purchases and lists payments from sales module
- Outstanding = sum of bills - payments

### Purchase Tab:

- Existing project list and other screens go here.. 

### Sales Tab

- Similar to purchase screens
- Add bill, Add payment buttons go to the add screen and add entries for sales module.. bills go to 'bills_sales' table, payments go to 'payments_sales' table.. 
- Lists all the projects. Project page shows customers list instead of Vendors.
- Instead of Vendor, show Customers in bills and payments
- For Bill page category use values from 'sales_categories' table. 

### Reports Tab

For now no content here.


## Others tasks:

- Change the date format to “DD/MM/YYYY” everywhere
