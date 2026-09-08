from datetime import date

from db import SessionLocal
from models import Committee, User, UserCommittee, UserRole

USERS = [
    ("Leigh", "Durham", "leighjdst@gmail.com", "technology_admin"),
    ("Beverly", "Sumpter", "bsumpter4@gmail.com", None),
    ("Gwendolyn", "Drummond", "sweetgum6@aol.com", None),
    ("Jennifer", "Simmons", "rx2002@aol.com", None),
    ("Michelle", "Linder-Coates", "mlindercoates@gmail.com", None),
    ("Joy", "Hunt", "JoyLHunt@gmail.com", "president"),
    ("Cheryl", "Smith", "Cherylasmith314@gmail.com", "first_vice_president"),
    ("Nikoia", "Forde", "NikoiaLForde@gmail.com", "second_vice_president"),
    ("La'Keisha", "Ciprian", "lakeisha.ciprian@gmail.com", "technology_chair")
]

COMMITTEES = [
    ("Social Action", "SA", "first_vice_president"),
    ("Adopt a Family", "AAF", "first_vice_president"),
    ("Economic Development/Financial Fortitude", "EDFF", "first_vice_president"),
    ("International Awareness & Involvement", "IAI", "first_vice_president"),
    ("Physical & Mental Health", "PMH", "first_vice_president"),
    ("Risk Management", "RM", "first_vice_president"),
    ("Arts & Letters", "AL", "second_vice_president"),
    ("Fundraising", "FUND", "second_vice_president"),
    ("Heritage & Archives", "HA", "second_vice_president"),
    ("LEAD", "LEAD", "second_vice_president"),
    ("Reclamation & Retention", "RR", "second_vice_president"),
    ("Scholarship", "SCH", "second_vice_president"),
    ("Technology", "TECH", "president")
]

ASSIGNMENTS = [
    ("leighjdst@gmail.com", "Social Action", "Member"),
    ("leighjdst@gmail.com", "Risk Management", "Co-Chair"),
    ("leighjdst@gmail.com", "Technology", "Member"),
    ("bsumpter4@gmail.com", "Arts & Letters", "Member"),
    ("bsumpter4@gmail.com", "Risk Management", "Co-Chair"),
    ("sweetgum6@aol.com", "Adopt a Family", "Co-Chair"),
    ("rx2002@aol.com", "Adopt a Family", "Co-Chair"),
    ("mlindercoates@gmail.com", "Arts & Letters", "Co-Chair")
]


def seed_development():
    session = SessionLocal()
    try:
        committee_lookup = {}
        for name, abbreviation, reviewer_role in COMMITTEES:
            committee = session.query(Committee).filter_by(comm_abbr=abbreviation).first()
            if committee:
                committee.committee_name = name
                committee.reviewer_role = reviewer_role
                committee.active = True
            else:
                committee = Committee(committee_name=name, comm_abbr=abbreviation, reviewer_role=reviewer_role, active=True)
                session.add(committee)
            committee_lookup[name] = committee
        session.flush()

        user_lookup = {}
        for f_name, l_name, email, role in USERS:
            user = session.query(User).filter_by(email=email).first()
            if not user:
                user = User(f_name=f_name, l_name=l_name, email=email, active=True)
                session.add(user)
                session.flush()
            user_lookup[email] = user

            if role and not session.query(UserRole).filter_by(user_id=user.user_id, role=role).first():
                session.add(UserRole(user_id=user.user_id, role=role, eff_start_dt=date.today(), active=True))

        session.flush()

        for email, committee_name, committee_role in ASSIGNMENTS:
            user = user_lookup[email]
            committee = committee_lookup[committee_name]
            existing = session.query(UserCommittee).filter_by(user_id=user.user_id, committee_id=committee.committee_id, committee_role=committee_role).first()
            if not existing:
                session.add(UserCommittee(user_id=user.user_id, committee_id=committee.committee_id, committee_role=committee_role, eff_start_dt=date.today(), active=True))

        session.commit()
        print("Development seed data created successfully.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_development()