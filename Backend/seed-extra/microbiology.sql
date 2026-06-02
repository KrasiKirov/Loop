INSERT INTO microbiology (question, answer1, answer2, answer3, answer4, correctanswer, feedback, score, subject) VALUES
-- PROKARYOTIC CELL STRUCTURE (easy)
('Which structure is responsible for protein synthesis in prokaryotes?', 'Ribosome', 'Mitochondrion', 'Endoplasmic reticulum', 'Golgi apparatus', 'Ribosome', 'Prokaryotes lack membrane-bound organelles but possess 70S ribosomes that carry out translation.', 800, 'Microbiology'),

('What is the primary function of the bacterial capsule?', 'Protection from phagocytosis', 'DNA replication', 'Energy production', 'Protein secretion', 'Protection from phagocytosis', 'The polysaccharide capsule shields bacteria from host phagocytes, acting as a key virulence factor.', 750, 'Microbiology'),

('Which component of the bacterial cell wall is targeted by penicillin?', 'Peptidoglycan', 'Lipopolysaccharide', 'Teichoic acid', 'Porin proteins', 'Peptidoglycan', 'Penicillin inhibits transpeptidase enzymes that cross-link peptidoglycan strands, weakening the cell wall.', 900, 'Microbiology'),

('What structure allows bacteria to adhere to surfaces and initiate biofilm formation?', 'Fimbriae (pili)', 'Flagella', 'Capsule', 'Endospore', 'Fimbriae (pili)', 'Fimbriae are short, hair-like appendages that mediate initial attachment of bacteria to host cells and abiotic surfaces.', 820, 'Microbiology'),

-- GRAM STAINING (easy/medium)
('In the Gram stain procedure, what is the purpose of the decolorizer step?', 'To wash away crystal violet from Gram-negative cells', 'To fix the smear to the slide', 'To stain Gram-positive cells red', 'To add the counterstain safranin', 'To wash away crystal violet from Gram-negative cells', 'The alcohol/acetone decolorizer dissolves the outer membrane of Gram-negative cells, releasing the crystal violet-iodine complex.', 870, 'Microbiology'),

('A bacterium stains pink after a Gram stain. What does this indicate about its cell wall?', 'It has a thin peptidoglycan layer and an outer membrane', 'It has a thick peptidoglycan layer with no outer membrane', 'It lacks a cell wall entirely', 'It contains large amounts of teichoic acid', 'It has a thin peptidoglycan layer and an outer membrane', 'Gram-negative bacteria appear pink because they lose crystal violet during decolorization and absorb safranin counterstain.', 950, 'Microbiology'),

('Which of the following is a Gram-positive bacterium?', 'Staphylococcus aureus', 'Escherichia coli', 'Neisseria gonorrhoeae', 'Salmonella enterica', 'Staphylococcus aureus', 'Staphylococcus aureus has a thick peptidoglycan cell wall that retains crystal violet, making it Gram-positive.', 780, 'Microbiology'),

-- BACTERIAL MORPHOLOGY (easy)
('Which bacterial morphology is described as a chain of spherical cells?', 'Streptococcus', 'Staphylococcus', 'Bacillus', 'Vibrio', 'Streptococcus', 'Streptococci divide in a single plane and remain attached, forming linear chains of cocci.', 720, 'Microbiology'),

('What is the term for the curved, comma-shaped bacterial morphology?', 'Vibrio', 'Spirochete', 'Coccobacillus', 'Spirillum', 'Vibrio', 'Vibrio cholerae is the classic example of a curved rod (vibrio) morphology.', 700, 'Microbiology'),

-- BACTERIAL GROWTH CURVE (medium)
('During which phase of the bacterial growth curve does the population size remain constant because growth equals death?', 'Stationary phase', 'Lag phase', 'Exponential (log) phase', 'Death phase', 'Stationary phase', 'In the stationary phase, nutrient depletion and waste accumulation cause growth rate to equal death rate, stabilising cell numbers.', 1000, 'Microbiology'),

('What is the term for the time required for a bacterial population to double during logarithmic growth?', 'Generation time', 'Doubling constant', 'Growth coefficient', 'Replication interval', 'Generation time', 'Generation time (doubling time) is the period between successive binary fissions under optimal conditions.', 950, 'Microbiology'),

-- MICROBIAL METABOLISM (medium/hard)
('Which metabolic pathway do obligate anaerobes use to generate ATP in the absence of oxygen?', 'Fermentation', 'Oxidative phosphorylation', 'Calvin cycle', 'Beta-oxidation', 'Fermentation', 'Obligate anaerobes rely solely on substrate-level phosphorylation (fermentation) because they cannot use oxygen as a terminal electron acceptor.', 1100, 'Microbiology'),

('What is the final electron acceptor in aerobic respiration?', 'Oxygen', 'NAD+', 'Pyruvate', 'Sulfate', 'Oxygen', 'In aerobic respiration, molecular oxygen accepts electrons at the end of the electron transport chain, forming water.', 800, 'Microbiology'),

('Which enzyme catalyses the conversion of pyruvate to acetyl-CoA, linking glycolysis to the TCA cycle?', 'Pyruvate dehydrogenase complex', 'Lactate dehydrogenase', 'Phosphofructokinase', 'Isocitrate dehydrogenase', 'Pyruvate dehydrogenase complex', 'The pyruvate dehydrogenase complex oxidatively decarboxylates pyruvate, producing acetyl-CoA, CO2, and NADH.', 1350, 'Microbiology'),

('What type of fermentation produces ethanol and CO2 as end products?', 'Alcoholic fermentation', 'Lactic acid fermentation', 'Mixed acid fermentation', 'Propionic acid fermentation', 'Alcoholic fermentation', 'Yeast and some bacteria reduce pyruvate to ethanol and CO2 to regenerate NAD+ under anaerobic conditions.', 1000, 'Microbiology'),

-- MICROBIAL GENETICS (medium/hard)
('In bacterial transformation, exogenous DNA enters a cell from which source?', 'The surrounding environment', 'A bacteriophage vector', 'Direct cell-to-cell contact', 'A plasmid donor cell', 'The surrounding environment', 'Transformation involves uptake of naked DNA from the environment by naturally or artificially competent bacteria.', 1050, 'Microbiology'),

('Which horizontal gene transfer mechanism requires direct physical contact between donor and recipient bacterial cells?', 'Conjugation', 'Transformation', 'Transduction', 'Transposition', 'Conjugation', 'Conjugation transfers DNA through a pilus-mediated mating junction, requiring cell-to-cell contact.', 1150, 'Microbiology'),

('In generalised transduction, which entity packages random fragments of host DNA into phage capsids?', 'A bacteriophage during assembly', 'A plasmid integrase', 'A restriction enzyme', 'A transposon', 'A bacteriophage during assembly', 'During generalised transduction, a phage mistakenly packages random bacterial DNA instead of its own genome into capsids.', 1400, 'Microbiology'),

('What type of genetic element is an F plasmid in Escherichia coli?', 'Conjugative plasmid encoding a sex pilus', 'Resistance plasmid encoding antibiotic resistance genes', 'Virulence plasmid encoding exotoxins', 'Bacteriocin-encoding plasmid', 'Conjugative plasmid encoding a sex pilus', 'The F (fertility) plasmid carries tra genes that encode the F pilus needed for conjugative mating.', 1500, 'Microbiology'),

('Which mutation type involves the insertion or deletion of a nucleotide, causing a shift in the reading frame?', 'Frameshift mutation', 'Missense mutation', 'Nonsense mutation', 'Silent mutation', 'Frameshift mutation', 'Insertions or deletions of one or two nucleotides shift the triplet reading frame, altering all downstream codons.', 1200, 'Microbiology'),

-- VIRUSES (medium/hard)
('In the lytic cycle of a bacteriophage, what is the immediate outcome after viral replication is complete?', 'Host cell lysis and release of new virions', 'Integration of viral DNA into the host chromosome', 'Host cell enters a dormant state', 'Viral DNA is degraded by host restriction enzymes', 'Host cell lysis and release of new virions', 'The lytic cycle culminates in lysis of the bacterial cell, releasing hundreds of progeny phage particles.', 950, 'Microbiology'),

('What term describes the state in which bacteriophage DNA is integrated into the host chromosome and replicates with it?', 'Lysogeny', 'Lytic infection', 'Transduction', 'Abortive infection', 'Lysogeny', 'In lysogeny, the phage genome (prophage) integrates into and replicates with the bacterial chromosome without causing immediate lysis.', 1100, 'Microbiology'),

('Which viral structural component is responsible for host cell receptor binding in animal viruses?', 'Envelope glycoproteins (spikes)', 'Capsid proteins', 'Matrix proteins', 'Polymerase complex', 'Envelope glycoproteins (spikes)', 'Surface glycoproteins on the viral envelope recognise and bind specific host cell receptors, initiating infection.', 1250, 'Microbiology'),

('What type of viral genome does HIV (Human Immunodeficiency Virus) possess?', 'Single-stranded positive-sense RNA', 'Double-stranded DNA', 'Single-stranded negative-sense RNA', 'Double-stranded RNA', 'Single-stranded positive-sense RNA', 'HIV is a retrovirus with a single-stranded (+)RNA genome that is reverse-transcribed into double-stranded DNA and integrated into the host genome.', 1450, 'Microbiology'),

('Which enzyme is unique to retroviruses and converts their RNA genome into DNA?', 'Reverse transcriptase', 'RNA polymerase', 'DNA ligase', 'Integrase', 'Reverse transcriptase', 'Reverse transcriptase is an RNA-dependent DNA polymerase encoded by retroviruses to convert their RNA genome into proviral DNA.', 1300, 'Microbiology'),

-- FUNGI & PROTOZOA BASICS (easy/medium)
('Which fungal cell wall component is absent in mammalian cells, making it a target for antifungal drugs?', 'Ergosterol', 'Cholesterol', 'Cellulose', 'Chitin', 'Ergosterol', 'Fungal membranes contain ergosterol instead of cholesterol; antifungals like amphotericin B and azoles exploit this difference.', 1050, 'Microbiology'),

('What is the asexual spore produced by Aspergillus species called?', 'Conidium', 'Ascospore', 'Basidiospore', 'Zygospore', 'Conidium', 'Aspergillus reproduces asexually by producing conidia (conidiospores) on specialised structures called conidiophores.', 900, 'Microbiology'),

('Malaria is caused by which genus of protozoan parasite?', 'Plasmodium', 'Trypanosoma', 'Leishmania', 'Giardia', 'Plasmodium', 'Plasmodium species (P. falciparum, P. vivax, etc.) are obligate intracellular protozoa transmitted by Anopheles mosquitoes.', 750, 'Microbiology'),

-- STERILIZATION & DISINFECTION (easy/medium)
('Which physical method achieves sterilisation by using saturated steam under pressure at 121 degrees C?', 'Autoclaving', 'Pasteurisation', 'Dry heat oven', 'UV irradiation', 'Autoclaving', 'An autoclave uses pressurised steam (121 degrees C, 15 psi, 15-20 min) to denature proteins and kill all microorganisms including spores.', 780, 'Microbiology'),

('What is the difference between sterilisation and disinfection?', 'Sterilisation destroys all microorganisms including spores; disinfection reduces microbial numbers but may not kill spores', 'Disinfection destroys all life; sterilisation reduces only bacterial numbers', 'Sterilisation applies only to liquids; disinfection applies to surfaces', 'They are synonymous terms', 'Sterilisation destroys all microorganisms including spores; disinfection reduces microbial numbers but may not kill spores', 'Sterilisation achieves complete elimination of all viable organisms, whereas disinfection reduces pathogen load to a safe level without necessarily achieving sterility.', 1000, 'Microbiology'),

('Which agent is classified as a high-level disinfectant capable of killing all microorganisms except high numbers of bacterial spores?', 'Glutaraldehyde', 'Isopropyl alcohol (70%)', 'Quaternary ammonium compounds', 'Soap and water', 'Glutaraldehyde', 'Glutaraldehyde is a high-level disinfectant/sterilant that alkylates proteins and nucleic acids, effective against most organisms including mycobacteria.', 1200, 'Microbiology'),

-- ANTIBIOTICS & RESISTANCE (medium/hard)
('Which class of antibiotics inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs)?', 'Beta-lactams', 'Aminoglycosides', 'Tetracyclines', 'Macrolides', 'Beta-lactams', 'Beta-lactam antibiotics (penicillins, cephalosporins, carbapenems) acylate PBPs and block peptidoglycan cross-linking.', 1100, 'Microbiology'),

('How do aminoglycoside antibiotics exert their bactericidal effect?', 'They bind the 30S ribosomal subunit and cause misreading of mRNA', 'They inhibit DNA gyrase', 'They block folic acid synthesis', 'They disrupt the cytoplasmic membrane', 'They bind the 30S ribosomal subunit and cause misreading of mRNA', 'Aminoglycosides irreversibly bind the 30S subunit, inducing codon misreading and producing aberrant proteins that disrupt the membrane.', 1400, 'Microbiology'),

('What is the mechanism of resistance in MRSA (methicillin-resistant Staphylococcus aureus)?', 'Acquisition of an altered penicillin-binding protein (PBP2a) with low beta-lactam affinity', 'Production of beta-lactamase that hydrolyses penicillin', 'Efflux pumps that expel methicillin', 'Modification of methicillin by acetyltransferases', 'Acquisition of an altered penicillin-binding protein (PBP2a) with low beta-lactam affinity', 'MRSA carries the mecA gene encoding PBP2a, which has reduced affinity for all beta-lactams and can continue cell wall synthesis in their presence.', 1700, 'Microbiology'),

('Which antibiotic class inhibits bacterial protein synthesis by blocking the 50S ribosomal subunit and preventing translocation?', 'Macrolides', 'Fluoroquinolones', 'Sulfonamides', 'Carbapenems', 'Macrolides', 'Macrolides (erythromycin, azithromycin) bind the 23S rRNA of the 50S subunit, blocking translocation of the growing peptide chain.', 1250, 'Microbiology'),

('Extended-spectrum beta-lactamases (ESBLs) confer resistance by which mechanism?', 'Hydrolysing a broad range of beta-lactam antibiotics including third-generation cephalosporins', 'Modifying the 30S ribosomal target site', 'Pumping antibiotics out of the cell via efflux', 'Methylating the 23S rRNA target', 'Hydrolysing a broad range of beta-lactam antibiotics including third-generation cephalosporins', 'ESBLs are plasmid-encoded enzymes that hydrolyse the beta-lactam ring of penicillins, cephalosporins, and monobactams but are inhibited by clavulanate.', 1800, 'Microbiology'),

-- IMMUNOLOGY BASICS (medium/hard)
('Which cells are the primary mediators of adaptive humoral immunity and produce antigen-specific antibodies?', 'B lymphocytes (plasma cells)', 'Cytotoxic T lymphocytes', 'Natural killer cells', 'Neutrophils', 'B lymphocytes (plasma cells)', 'B cells differentiate into plasma cells upon antigen stimulation, secreting antibodies that neutralise pathogens and opsonise targets.', 1050, 'Microbiology'),

('Which complement pathway is activated directly by bacterial surface molecules without antibody involvement?', 'Alternative pathway', 'Classical pathway', 'Lectin pathway', 'Terminal pathway', 'Alternative pathway', 'The alternative complement pathway is triggered by spontaneous C3 hydrolysis stabilised on microbial surfaces such as LPS, without requiring antibodies.', 1450, 'Microbiology'),

('What is opsonisation in the context of innate immunity?', 'Coating of pathogens with antibodies or complement to enhance phagocytosis', 'Direct killing of bacteria by natural killer cells', 'Release of cytokines to recruit inflammatory cells', 'Formation of the membrane attack complex', 'Coating of pathogens with antibodies or complement to enhance phagocytosis', 'Opsonins (IgG, C3b) coat microbial surfaces and bind Fc or complement receptors on phagocytes, greatly increasing engulfment efficiency.', 1200, 'Microbiology'),

('Toll-like receptors (TLRs) are pattern recognition receptors that detect which type of molecules?', 'Pathogen-associated molecular patterns (PAMPs)', 'MHC class II molecules', 'Antigen-antibody complexes', 'Cytokine receptors', 'Pathogen-associated molecular patterns (PAMPs)', 'TLRs on innate immune cells recognise conserved microbial structures (PAMPs) such as LPS, flagellin, and CpG DNA, triggering inflammatory responses.', 1350, 'Microbiology'),

-- NORMAL FLORA (easy/medium)
('Which anatomical site of the human body is normally considered sterile (free of resident microbiota)?', 'Urinary bladder', 'Oral cavity', 'Large intestine', 'Skin', 'Urinary bladder', 'The urinary bladder and its contents are normally sterile; the presence of bacteria indicates urinary tract infection.', 830, 'Microbiology'),

('What term describes the beneficial relationship where normal flora prevents colonisation by pathogens?', 'Colonisation resistance', 'Symbiosis', 'Commensalism', 'Mutualism', 'Colonisation resistance', 'Colonisation resistance describes how indigenous microbiota competitively excludes pathogens through nutrient competition, pH changes, and bacteriocin production.', 1000, 'Microbiology'),

-- PATHOGENESIS & VIRULENCE FACTORS (medium/hard)
('Which toxin produced by Clostridium botulinum causes flaccid paralysis by blocking acetylcholine release at neuromuscular junctions?', 'Botulinum toxin (BoNT)', 'Tetanospasmin', 'Shiga toxin', 'Cholera toxin', 'Botulinum toxin (BoNT)', 'Botulinum toxin cleaves SNARE proteins required for synaptic vesicle fusion, preventing acetylcholine release and causing flaccid paralysis.', 1600, 'Microbiology'),

('What virulence factor allows Streptococcus pyogenes to degrade fibrin clots and spread through tissue?', 'Streptokinase', 'Hyaluronidase', 'Protein A', 'Coagulase', 'Streptokinase', 'Streptokinase (fibrinolysin) activates plasminogen to plasmin, dissolving fibrin clots and enabling bacterial spread through connective tissue.', 1300, 'Microbiology'),

('Endotoxin (LPS) triggers systemic inflammatory response syndrome primarily through stimulation of which cell type?', 'Macrophages', 'B lymphocytes', 'Cytotoxic T cells', 'Mast cells', 'Macrophages', 'LPS binds TLR4 on macrophages, triggering massive cytokine release (TNF-alpha, IL-1, IL-6) that drives systemic inflammation and septic shock.', 1500, 'Microbiology'),

-- BIOFILMS & QUORUM SENSING (hard)
('What is the primary advantage biofilm formation confers on bacteria in clinical settings?', 'Increased resistance to antibiotics and host defences', 'Faster growth rate than planktonic cells', 'Greater nutrient absorption efficiency', 'Enhanced motility for tissue invasion', 'Increased resistance to antibiotics and host defences', 'Biofilm matrix (extracellular polymeric substances) limits antibiotic penetration, reduces oxygen availability, and shields bacteria from phagocytosis.', 1400, 'Microbiology'),

('Quorum sensing coordinates group behaviours in bacteria when autoinducer concentrations exceed which threshold?', 'A population-density-dependent threshold specific to the species', 'A fixed concentration of 10 micromolar', 'The minimum inhibitory concentration of the inducer', 'A threshold set by environmental temperature', 'A population-density-dependent threshold specific to the species', 'Quorum sensing relies on accumulation of species-specific autoinducers; when their concentration reflects sufficient cell density, they bind receptors and activate target genes.', 1700, 'Microbiology'),

-- LAB TECHNIQUES (medium/hard)
('Which culture medium is both selective and differential, used to isolate Gram-negative enteric bacteria while distinguishing lactose fermenters from non-fermenters?', 'MacConkey agar', 'Blood agar', 'Nutrient agar', 'Chocolate agar', 'MacConkey agar', 'MacConkey agar contains bile salts (selective against Gram-positives) and neutral red indicator; lactose fermenters produce pink colonies while non-fermenters remain colourless.', 1150, 'Microbiology'),

('In PCR (polymerase chain reaction), what is the purpose of the denaturation step?', 'To separate the double-stranded DNA template into single strands', 'To allow primers to anneal to the template', 'To extend new DNA from primers using Taq polymerase', 'To introduce dNTPs into the reaction', 'To separate the double-stranded DNA template into single strands', 'Heating to ~94-96 degrees C breaks hydrogen bonds between complementary bases, producing single-stranded DNA templates accessible to primers.', 1100, 'Microbiology'),

('Which technique uses a specific labelled probe hybridised to electrophoretically separated DNA fragments to detect a target gene?', 'Southern blotting', 'Western blotting', 'ELISA', 'Flow cytometry', 'Southern blotting', 'Southern blotting transfers DNA from a gel to a membrane, then uses a complementary labelled probe to detect and locate specific DNA sequences.', 1600, 'Microbiology');
