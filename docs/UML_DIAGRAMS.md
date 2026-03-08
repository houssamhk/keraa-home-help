# UML Diagrams - Rental Property Management Platform

## Generated Images
All images are saved in `public/uml/`:
- `use-case-diagram.png` - Use Case Diagram
- `class-diagram.png` - Class Diagram
- `sequence-diagram-rental.png` - Sequence Diagram (Rental Process)
- `sequence-diagram-handyman.png` - Sequence Diagram (Handyman Service)
- `activity-diagram.png` - Activity Diagram

---

## 1. Use Case Diagram (Mermaid - Accurate Source)

> Copy this to https://mermaid.live or any Mermaid renderer for a clean export.

```mermaid
graph TB
    subgraph "Rental Property Management System"
        UC1["Search Properties"]
        UC2["Book Viewing"]
        UC3["Sign Contract"]
        UC4["Pay Rent"]
        UC5["Request Handyman Service"]
        UC6["Chat with Owner"]
        UC7["Submit KYC"]
        UC8["Manage Wallet"]
        UC9["Set Search Alert"]
        UC10["List Property"]
        UC11["Manage Contracts"]
        UC12["Review Tenants"]
        UC13["Track Payments"]
        UC14["View Analytics"]
        UC15["Feature Listing"]
        UC16["Manage Multiple Listings"]
        UC17["Agency Dashboard"]
        UC18["Subscribe to Package"]
        UC19["Verify KYC"]
        UC20["Approve Payments"]
        UC21["Manage Reports"]
        UC22["View Demand Heatmap"]
        UC23["Manage Users"]
    end

    Tenant((Tenant))
    Owner((Owner/Provider))
    Agency((Agency))
    Admin((Admin))

    Tenant --> UC1
    Tenant --> UC2
    Tenant --> UC3
    Tenant --> UC4
    Tenant --> UC5
    Tenant --> UC6
    Tenant --> UC7
    Tenant --> UC8

    Owner --> UC10
    Owner --> UC11
    Owner --> UC12
    Owner --> UC13
    Owner --> UC14
    Owner --> UC3

    Agency --> UC16
    Agency --> UC17
    Agency --> UC18

    Admin --> UC19
    Admin --> UC20
    Admin --> UC21
    Admin --> UC22
    Admin --> UC23

    UC3 -.->|include| UC7
    UC4 -.->|include| UC8
    UC9 -.->|extend| UC1
    UC15 -.->|extend| UC10
```

---

## 2. Class Diagram (Mermaid - Accurate Source)

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String full_name
        +String phone
        +String role_type
        +String avatar_url
        +Boolean kyc_verified
        +Float avg_rating
        +Int total_reviews
        +register()
        +login()
        +updateProfile()
    }

    class Property {
        +UUID id
        +String title
        +String description
        +Float price
        +String price_period
        +String city
        +String address
        +Int bedrooms
        +Int bathrooms
        +Float area_sqm
        +String property_type
        +Boolean is_available
        +String[] images
        +String[] amenities
        +create()
        +update()
        +delete()
        +search()
    }

    class Contract {
        +UUID id
        +String title
        +String contract_type
        +Date start_date
        +Date end_date
        +Float monthly_amount
        +Float total_amount
        +String status
        +Boolean landlord_signed
        +Boolean tenant_signed
        +String terms
        +create()
        +sign()
        +terminate()
        +exportPDF()
    }

    class ServiceRequest {
        +UUID id
        +String service_type
        +String description
        +String status
        +Date preferred_date
        +String preferred_time
        +String address
        +Float estimated_price
        +Float final_price
        +create()
        +accept()
        +start()
        +complete()
        +cancel()
    }

    class Wallet {
        +UUID id
        +Float balance
        +Float pending_balance
        +String currency
        +deposit()
        +withdraw()
        +holdEscrow()
        +releaseEscrow()
    }

    class WalletTransaction {
        +UUID id
        +Float amount
        +String type
        +String status
        +String description
        +String reference_type
        +String reference_id
    }

    class KYCVerification {
        +UUID id
        +String id_type
        +String id_front_url
        +String id_back_url
        +String selfie_url
        +String status
        +Date submitted_at
        +Date verified_at
        +String rejection_reason
        +submit()
        +verify()
        +reject()
    }

    class Handyman {
        +UUID id
        +String[] specialty
        +Float rating
        +Float hourly_rate
        +Boolean is_available
        +Float latitude
        +Float longitude
        +Int service_area_km
        +Int total_reviews
        +updateAvailability()
        +updateLocation()
    }

    class Review {
        +UUID id
        +Int rating
        +String comment
        +String reviewer_role
        +String[] badges
        +create()
    }

    class Bill {
        +UUID id
        +String bill_type
        +String title
        +Float amount
        +Date due_date
        +String status
        +Boolean recurring
        +pay()
        +setReminder()
    }

    class Conversation {
        +UUID id
        +UUID participant_1
        +UUID participant_2
        +DateTime last_message_at
        +sendMessage()
    }

    class Message {
        +UUID id
        +String content
        +UUID sender_id
        +Boolean is_read
    }

    class Notification {
        +UUID id
        +String title
        +String message
        +String type
        +Boolean is_read
    }

    class SearchAlert {
        +UUID id
        +String name
        +String city
        +String property_type
        +Float min_price
        +Float max_price
        +Boolean is_active
    }

    class Arrabon {
        +UUID id
        +Float amount
        +String payment_method
        +String status
        +String payment_proof_url
    }

    class AgencySubscription {
        +UUID id
        +String agency_name
        +String status
        +Date starts_at
        +Date expires_at
    }

    class FeaturedListing {
        +UUID id
        +Int duration_days
        +String feature_type
        +String status
        +Float price_paid
    }

    User "1" --> "0..*" Property : owns
    User "1" --> "0..*" Contract : as landlord
    User "1" --> "0..*" Contract : as tenant
    User "1" --> "1" Wallet : has
    User "1" --> "0..1" KYCVerification : submits
    User "1" --> "0..1" Handyman : extends as
    User "1" --> "0..*" Conversation : participates
    User "1" --> "0..*" Notification : receives
    User "1" --> "0..*" SearchAlert : creates
    User "1" --> "0..1" AgencySubscription : subscribes

    Property "1" --> "0..*" Contract : subject of
    Property "1" --> "0..*" FeaturedListing : promoted by

    Contract "1" --> "0..*" Bill : generates
    Contract "1" --> "0..*" Review : receives
    Contract "1" --> "0..*" Arrabon : secured by

    Handyman "1" --> "0..*" ServiceRequest : receives
    User "1" --> "0..*" ServiceRequest : as client

    Wallet "1" --> "0..*" WalletTransaction : records
    Conversation "1" --> "0..*" Message : contains
```

---

## 3. Sequence Diagram - Property Rental Process

```mermaid
sequenceDiagram
    actor T as Tenant
    participant S as System
    actor O as Owner
    participant C as Contract
    participant W as Wallet
    actor A as Admin

    T->>S: searchProperties(filters)
    S-->>T: propertyList

    T->>S: bookViewing(propertyId)
    S->>O: notifyViewingRequest()
    O->>S: confirmViewing()
    S-->>T: viewingConfirmed

    T->>S: requestContract(propertyId)
    S->>C: createContract()
    C-->>S: contractCreated
    S->>O: notifyContractRequest()
    O->>C: signContract()

    alt KYC Required
        S->>T: requestKYC()
        T->>S: submitKYC(documents)
        S->>A: notifyKYCReview()
        A->>S: verifyKYC(approved)
        S-->>T: kycVerified
    end

    T->>C: signContract()
    Note over T,C: Both parties signed

    T->>W: payArrabon(amount)
    W-->>S: arrabonHeld
    S->>A: notifyPaymentVerification()
    A->>S: approvePayment()
    S->>W: releaseToOwner(amount)
    W-->>O: paymentReceived

    S-->>T: contractActive
    S-->>O: contractActive
```

---

## 4. Sequence Diagram - Handyman Service Request

```mermaid
sequenceDiagram
    actor C as Client
    participant S as System
    actor H as Handyman
    participant W as Wallet

    C->>S: searchHandymen(filters)
    S-->>C: handymanList

    C->>S: createServiceRequest(details)
    S->>H: notifyNewRequest()

    H->>S: acceptRequest(estimatedPrice)
    S-->>C: requestAccepted

    C->>W: holdEscrow(estimatedPrice)
    W-->>S: escrowHeld

    H->>S: startService()
    S-->>C: serviceStarted

    H->>S: completeService(finalPrice)
    S-->>C: serviceCompleted

    opt Client Satisfied
        C->>S: confirmCompletion()
        S->>W: releaseEscrow(handymanId, finalPrice)
        W-->>H: paymentReleased
    end

    opt Dispute
        C->>S: raiseDispute(reason)
        S->>S: holdEscrow()
        Note over S: Admin reviews dispute
    end

    C->>S: leaveReview(rating, comment)
    H->>S: leaveClientReview(rating, comment)
    S-->>C: reviewsRecorded
    S-->>H: reviewsRecorded
```

---

## 5. Activity Diagram - User Registration and Property Rental

```mermaid
flowchart TD
    START((Start)) --> OPEN[Open Application]
    OPEN --> DECISION1{New or Existing User?}

    DECISION1 -->|New User| REGISTER[Register Account]
    DECISION1 -->|Existing User| LOGIN[Login]

    REGISTER --> SELECT_ROLE[Select Role: Tenant / Owner / Handyman]
    SELECT_ROLE --> FORK1

    FORK1 --> PROFILE[Complete Profile]
    FORK1 --> KYC[Submit KYC Documents]

    PROFILE --> JOIN1
    KYC --> KYC_REVIEW{KYC Decision}
    KYC_REVIEW -->|Approved| JOIN1
    KYC_REVIEW -->|Rejected| RESUBMIT[Resubmit Documents]
    RESUBMIT --> KYC

    LOGIN --> DASHBOARD
    JOIN1 --> DASHBOARD[View Dashboard]

    DASHBOARD --> ROLE_DECISION{User Role?}

    ROLE_DECISION -->|Tenant| SEARCH[Search Properties]
    ROLE_DECISION -->|Owner| ADD_PROP[Add Property Details]
    ROLE_DECISION -->|Handyman| WAIT_REQ[Wait for Service Requests]

    SEARCH --> VIEW_DETAIL[View Property Details]
    VIEW_DETAIL --> INTEREST{Interested?}
    INTEREST -->|No| SEARCH
    INTEREST -->|Yes| BOOK_VIEW[Book Viewing]
    BOOK_VIEW --> VIEWING_DONE{Proceed?}
    VIEWING_DONE -->|No| SEARCH
    VIEWING_DONE -->|Yes| REQUEST_CONTRACT[Request Contract]
    REQUEST_CONTRACT --> SIGN[Sign Contract]
    SIGN --> PAY_ARRABON[Pay Arrabon]
    PAY_ARRABON --> ADMIN_VERIFY{Payment Verified?}
    ADMIN_VERIFY -->|Yes| CONTRACT_ACTIVE[Contract Active]
    ADMIN_VERIFY -->|No| PAY_ARRABON
    CONTRACT_ACTIVE --> END_NODE((End))

    ADD_PROP --> UPLOAD_IMG[Upload Images]
    UPLOAD_IMG --> PUBLISH[Publish Listing]
    PUBLISH --> FEATURE_DECISION{Feature Listing?}
    FEATURE_DECISION -->|Yes| PAY_FEATURE[Pay for Featured]
    FEATURE_DECISION -->|No| WAIT_TENANT[Wait for Tenant]
    PAY_FEATURE --> WAIT_TENANT
    WAIT_TENANT --> END_NODE

    WAIT_REQ --> ACCEPT_REQ{Accept Request?}
    ACCEPT_REQ -->|Yes| START_SERVICE[Start Service]
    ACCEPT_REQ -->|No| WAIT_REQ
    START_SERVICE --> COMPLETE_SERVICE[Complete Service]
    COMPLETE_SERVICE --> RECEIVE_PAYMENT[Receive Payment]
    RECEIVE_PAYMENT --> LEAVE_REVIEW[Leave Review]
    LEAVE_REVIEW --> END_NODE
```

---

## 6. Activity Diagram - KYC Verification Process (Admin)

```mermaid
flowchart TD
    START((Start)) --> RECEIVE[Receive KYC Submission]
    RECEIVE --> CHECK_DOCS[Check ID Documents]
    CHECK_DOCS --> VALID_DOCS{Documents Valid?}

    VALID_DOCS -->|No| REQUEST_RESUBMIT[Request Resubmission]
    REQUEST_RESUBMIT --> NOTIFY_USER[Notify User]
    NOTIFY_USER --> END_REJECT((End - Rejected))

    VALID_DOCS -->|Yes| VERIFY_SELFIE[Verify Selfie Match]
    VERIFY_SELFIE --> SELFIE_MATCH{Selfie Matches ID?}

    SELFIE_MATCH -->|No| REQUEST_RESUBMIT

    SELFIE_MATCH -->|Yes| APPROVE[Approve KYC]
    APPROVE --> UPDATE_PROFILE[Update User Profile]
    UPDATE_PROFILE --> LOG_AUDIT[Log Audit Trail]
    LOG_AUDIT --> NOTIFY_APPROVED[Notify User - Approved]
    NOTIFY_APPROVED --> END_OK((End - Verified))
```

---

## How to Export as Images

1. **Mermaid Live Editor**: Go to https://mermaid.live, paste each diagram code, and export as PNG/SVG
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **CLI**: Use `mmdc` (Mermaid CLI): `npx @mermaid-js/mermaid-cli mmdc -i input.md -o output.png`
